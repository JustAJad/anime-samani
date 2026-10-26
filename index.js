// SPDX-License-Identifier: MPL-2.0
// Anime Samani. Original application: AlexAnimateMp4. See CREDITS.md.
const { app, BrowserWindow, WebContentsView, protocol, nativeTheme } = require('electron');
const { join } = require('node:path');
const { readFileSync } = require('node:fs');
const Store = require('electron-store');
const pkg = require('./package.json');
const { defaults, sanitize } = require('./lib/preferences');
const { siteUrl, setSiteDomain, addKnownDomains, migrateSiteUrl } = require('./lib/navigation');
const { normalizeFavorites } = require('./lib/library');
const { createMediaStore } = require('./lib/media');
const { createProgress } = require('./lib/progress');
const { parseAppLink } = require('./lib/links');
const { installUpdates } = require('./lib/updates');
const { Presence } = require('./lib/presence');
const { createContext } = require('./lib/main/context');
const { installSite } = require('./lib/main/site');
const { installDesktop } = require('./lib/main/desktop');
const { installDiscovery } = require('./lib/main/discovery');
const { installAdFilter } = require('./lib/ads');
const { installMenus } = require('./lib/main/menu');

const BACKGROUND = '#0b0c10';
const WINDOW = {
  width: 1360,
  height: 900,
  minWidth: 980,
  minHeight: 680,
  maxWidth: 2200,
  maxHeight: 1500,
};
// Never let a stuck renderer or slow network trap the user in the intro.
const INTRO_TIMEOUT_MS = 3000;
const INTRO_TIMEOUT_REDUCED_MS = 300;

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'samani-media',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);
app.setName('Anime Samani');
// Keep the existing profile location so cookies and settings survive updates.
app.setPath(
  'userData',
  process.env.SAMANI_TEST_PROFILE || join(app.getPath('appData'), 'anime-sama-to-desktop')
);

// Deep links can arrive before the window exists; the latest one wins.
let pendingAppLink = process.argv.map(parseAppLink).find(Boolean);
let dispatchAppLink;
app.on('open-url', (event, url) => {
  event.preventDefault();
  const link = parseAppLink(url);
  if (!link) return;
  pendingAppLink = link;
  dispatchAppLink?.(link);
});

/** Preferences, imported once from the original app's settings file. */
function loadPreferences(config) {
  if (config.has('preferences')) return sanitize(config.get('preferences', defaults));
  let preferences = sanitize(defaults);
  try {
    const file = join(app.getPath('userData'), 'settings.json');
    const old = JSON.parse(readFileSync(file, 'utf8')).ANIME_SAMA_JUST_A_JAD;
    if (old) {
      preferences = sanitize({
        language: 'fr',
        alwaysOnTop: old.ALWAYS_ON_TOP,
        minimizeToTray: old.MINIMIZE_TO_TRAY,
        rememberWindow: old.SAVE_WINDOW_SIZE,
        startAtLogin: old.START_UP,
      });
    }
  } catch {
    /* A fresh installation starts with the French Samani theme. */
  }
  config.set('preferences', preferences);
  return preferences;
}

/** V1 keeps only anime favorites; the previous list is kept as a backup. */
function migrateLibrary(libraryStore) {
  if (libraryStore.has('v1AnimeLibrary')) return;
  const favorites = libraryStore.get('favorites', []);
  libraryStore.set('favoritesBackup', favorites);
  libraryStore.set('favorites', normalizeFavorites(favorites));
  libraryStore.set('v1AnimeLibrary', true);
}

function createWindow(preferences, saved) {
  const remember = preferences.rememberWindow;
  const size = (value, fallback, min, max) =>
    remember ? Math.max(min, Math.min(max, value || fallback)) : fallback;
  const window = new BrowserWindow({
    width: size(saved.width, WINDOW.width, WINDOW.minWidth, WINDOW.maxWidth),
    height: size(saved.height, WINDOW.height, WINDOW.minHeight, WINDOW.maxHeight),
    minWidth: WINDOW.minWidth,
    minHeight: WINDOW.minHeight,
    show: false,
    title: 'Anime Samani',
    backgroundColor: BACKGROUND,
    icon: join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'desktop/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  window.setAlwaysOnTop(preferences.alwaysOnTop);
  const site = new WebContentsView({
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.contentView.addChildView(site);
  site.setBackgroundColor('#00000000');
  site.setVisible(false);
  return { window, site };
}

async function startup() {
  await app.whenReady();
  nativeTheme.themeSource = 'dark';
  const config = new Store({ name: 'samani-preferences' });
  const libraryStore = new Store({
    name: 'samani-library',
    defaults: { favorites: [], recent: [] },
  });
  migrateLibrary(libraryStore);
  const preferences = loadPreferences(config);
  addKnownDomains((config.get('domainScan')?.results || []).map(result => result.domain));
  setSiteDomain(preferences.domain);

  const media = createMediaStore(join(app.getPath('userData'), 'samani-media'));
  // Clears backgrounds left behind by earlier versions, which never deleted replaced files.
  media.keepOnly(preferences.media);
  protocol.handle('samani-media', request => media.serve(request));

  const { window, site } = createWindow(preferences, config.get('window', {}));
  const ctx = createContext({
    window,
    site,
    config,
    libraryStore,
    progress: createProgress(
      new Store({ name: 'samani-progress', accessPropertiesByDotNotation: false })
    ),
    media,
    presence: new Presence(),
    preferences,
    pkg,
  });
  ctx.updates = installUpdates(app, window, {
    notify: () => ctx.send(),
    language: () => ctx.preferences.language,
    beforeInstall: () => (ctx.quitting = true),
    minimumReleaseDate: pkg.updates?.minimumReleaseDate,
  });
  ctx.presence.on('status', () => ctx.send());
  installSite(ctx);
  installDiscovery(ctx);
  installAdFilter(ctx);
  installDesktop(ctx);
  installMenus(ctx);

  await window.loadFile(join(__dirname, 'desktop/index.html'));
  ctx.ready = true;
  ctx.send();
  window.show();
  const introTimeout = preferences.reducedMotion ? INTRO_TIMEOUT_REDUCED_MS : INTRO_TIMEOUT_MS;
  setTimeout(() => {
    ctx.intro = false;
    ctx.visibility();
  }, introTimeout).unref();

  dispatchAppLink = link => {
    // Links parsed before the saved domain was applied may still point to the default one.
    const url = migrateSiteUrl(link.url);
    ctx.pendingResume = link.episode ? { ...link, url } : null;
    ctx.navigate(url);
    ctx.focus();
  };
  if (app.isPackaged) {
    const portable = process.env.PORTABLE_EXECUTABLE_FILE;
    if (portable) app.setAsDefaultProtocolClient(pkg.protocol, portable);
    else app.setAsDefaultProtocolClient(pkg.protocol);
  }
  ctx.updateRpc();
  ctx.discoverDomain();
  if (pendingAppLink) dispatchAppLink(pendingAppLink);
  else ctx.navigate(siteUrl());

  app.on('second-instance', (_event, argv) => {
    const link = argv.map(parseAppLink).find(Boolean);
    if (link) dispatchAppLink(link);
    else ctx.focus();
  });
  app.on('activate', () => window.show());
  app.on('before-quit', () => {
    ctx.quitting = true;
  });
}

if (app.requestSingleInstanceLock()) {
  startup().catch(error => {
    console.error(error);
    app.exit(1);
  });
} else {
  app.quit();
}
app.on('window-all-closed', () => app.quit());
