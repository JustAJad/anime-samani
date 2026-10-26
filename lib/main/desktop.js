// SPDX-License-Identifier: MPL-2.0
// Requests from the desktop interface, keyboard shortcuts and window lifecycle.
const { app, ipcMain, dialog } = require('electron');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { sanitize } = require('../preferences');
const {
  siteUrl,
  siteDomain,
  isSiteUrl,
  migrateSiteUrl,
  normalizeDomain,
  setSiteDomain,
} = require('../navigation');
const { animeIdentity, isAnime, favoriteEntry, normalizeFavorites } = require('../library');
const { EXTENSIONS } = require('../media');
const { MAX_FAVORITES } = require('./site');

const SAVE_BOUNDS_DELAY_MS = 500;

/** @param {import('./context').Context} ctx */
function installDesktop(ctx) {
  const { window, wc, config, libraryStore, media, repository } = ctx;
  const desktop = window.webContents;
  const desktopUrl = pathToFileURL(join(__dirname, '../../desktop/index.html')).href;
  const command = name => desktop.send('samani:command', name);
  const links = {
    source: repository,
    downloads: `${repository}/releases`,
    report: `${repository}/issues/new/choose`,
    jad: 'https://github.com/JustAJad',
    bourinou: 'https://github.com/Bourinou',
    alex: 'https://github.com/AlexAnimateMp4/anime-sama-fr-desktop',
    raphael: 'https://github.com/raphael-as/anime-sama-fr-desktop',
  };
  const routes = {
    home: '/',
    catalogue: '/catalogue/',
    planning: '/planning/',
    profile: '/profil/',
    help: '/aide/',
  };

  // Only the top document of the bundled interface may call native features.
  const trusted = event =>
    !window.isDestroyed() &&
    !desktop.isDestroyed() &&
    event.sender === desktop &&
    event.senderFrame &&
    event.senderFrame === desktop.mainFrame &&
    event.senderFrame.url.split('#')[0] === desktopUrl;
  const handle = (channel, callback) =>
    ipcMain.handle(channel, (event, ...args) => {
      if (!trusted(event)) throw new Error('Untrusted desktop request');
      return callback(...args);
    });

  const actions = {
    back: () => wc.navigationHistory.canGoBack() && wc.navigationHistory.goBack(),
    forward: () => wc.navigationHistory.canGoForward() && wc.navigationHistory.goForward(),
    reload: () => ctx.reload(),
    browser: () => ctx.openExternal(ctx.error?.url || ctx.page.url || siteUrl()),
    cinema: () => ctx.toggleCinema(),
    fullscreen: () => window.setFullScreen(!window.isFullScreen()),
    'guide-open': () => {
      if (config.get('guideV1Complete', false)) return;
      ctx.guiding = true;
      ctx.visibility();
    },
    'guide-complete': () => {
      ctx.guiding = false;
      config.set('guideV1Complete', true);
      ctx.send();
    },
    'intro-done': () => {
      ctx.intro = false;
      ctx.visibility();
    },
  };

  handle('samani:bootstrap', () => ctx.state());
  handle('samani:update', action => ctx.updates.action(action));
  handle('samani:navigate', route => {
    if (route === 'resume') {
      const item = libraryStore.get('recent', []).find(entry => entry.episode);
      if (!item) return false;
      ctx.pendingResume = { ...item, url: migrateSiteUrl(item.url) };
      return ctx.navigate(ctx.pendingResume.url);
    }
    const url = migrateSiteUrl(route);
    if (Object.hasOwn(routes, route)) return ctx.navigate(siteUrl() + routes[route]);
    return ctx.navigate(isSiteUrl(url) ? url : siteUrl());
  });
  handle('samani:panel', value => {
    ctx.panel = value === true;
    ctx.visibility();
  });
  handle('samani:action', action => {
    if (action === 'anime-sama') ctx.openExternal(`${siteUrl()}/`);
    else if (Object.hasOwn(actions, action)) actions[action]();
    else if (Object.hasOwn(links, action)) ctx.openExternal(links[action]);
  });
  handle('samani:preferences', patch => {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return ctx.state();
    const previous = ctx.preferences;
    // Only the native media picker grants a background file, and the domain has its own request.
    const { media: _media, domain: _domain, ...safePatch } = patch;
    ctx.preferences = sanitize(safePatch, previous);
    config.set('preferences', ctx.preferences);
    window.setAlwaysOnTop(ctx.preferences.alwaysOnTop);
    if (!ctx.preferences.rememberWindow) config.delete('window');
    const loginItems = ['win32', 'darwin'].includes(process.platform);
    if (loginItems && ctx.preferences.startAtLogin !== previous.startAtLogin) {
      app.setLoginItemSettings({ openAtLogin: ctx.preferences.startAtLogin });
    }
    if (ctx.preferences.language !== previous.language) ctx.refreshMenus();
    ctx.restyle();
    if (ctx.preferences.autoDomain && !previous.autoDomain) ctx.discoverDomain();
    ctx.updateRpc();
    ctx.send();
    return ctx.state();
  });
  handle('samani:domain', value => {
    const domain = normalizeDomain(value);
    if (!domain) throw new Error(ctx.t('invalidDomain'));
    if (domain === siteDomain()) return ctx.state();
    const current = ctx.error?.url || ctx.page.url;
    setSiteDomain(domain);
    ctx.preferences = sanitize({ ...ctx.preferences, domain });
    config.set('preferences', ctx.preferences);
    // Stay on the same page: the previous domain is known, so its URL migrates.
    const next = migrateSiteUrl(current);
    ctx.navigate(isSiteUrl(next) ? next : siteUrl());
    ctx.send();
    return ctx.state();
  });
  handle('samani:domains', async () => {
    await ctx.scanDomains();
    return ctx.state();
  });
  handle('samani:media', async kind => {
    if (!Object.hasOwn(EXTENSIONS, kind)) return ctx.state();
    const result = await dialog.showOpenDialog(window, {
      title: ctx.t('chooseMedia'),
      properties: ['openFile'],
      filters: [{ name: ctx.t(kind), extensions: EXTENSIONS[kind].map(ext => ext.slice(1)) }],
    });
    if (result.canceled) return ctx.state();
    let id;
    try {
      id = media.import(result.filePaths[0], kind);
    } catch (error) {
      throw new Error(ctx.t(error.message));
    }
    const previous = ctx.preferences.media;
    ctx.preferences = sanitize({ ...ctx.preferences, media: id, background: kind });
    config.set('preferences', ctx.preferences);
    ctx.send();
    // The renderer has switched to the new file; the old copy is no longer needed.
    if (previous && previous !== id) media.remove(previous);
    return ctx.state();
  });
  handle('samani:library', (action, url) => {
    if (action === 'clear-recent') libraryStore.set('recent', []);
    else if (action === 'favorite') toggleFavorite(url);
    ctx.send();
    return ctx.state();
  });
  function toggleFavorite(url) {
    const show = animeIdentity(url || ctx.page.url);
    if (!show) return;
    const items = normalizeFavorites(libraryStore.get('favorites', []));
    const exists = items.some(item => item.id === show.id);
    if (exists) {
      libraryStore.set(
        'favorites',
        items.filter(item => item.id !== show.id)
      );
    } else {
      // Adding needs the show's own page so the entry gets its real title and cover.
      const onShowPage =
        isAnime(ctx.page) && show.id === animeIdentity(ctx.page.url)?.id && !ctx.loading;
      if (!onShowPage || ctx.error) return;
      libraryStore.set('favorites', [favoriteEntry(ctx.page), ...items].slice(0, MAX_FAVORITES));
    }
    // Keep the site's own favorite button in sync.
    if (show.id === animeIdentity(wc.getURL())?.id) {
      wc.send('samani:favorite-request', { url: wc.getURL(), added: !exists });
    }
  }

  ipcMain.on('samani:bounds', (event, value) => {
    const keys = ['x', 'y', 'width', 'height'];
    if (!trusted(event) || !value || !keys.every(key => Number.isFinite(value[key]))) return;
    const [width, height] = window.getContentSize();
    const clamp = (number, max) => Math.max(0, Math.min(max, Math.round(number)));
    const x = clamp(value.x, width);
    const y = clamp(value.y, height);
    ctx.bounds = {
      x,
      y,
      width: clamp(value.width, width - x),
      height: clamp(value.height, height - y),
    };
    ctx.visibility();
  });

  const keyboard = (event, input) => {
    if (input.type !== 'keyDown') return;
    const key = input.key.toLowerCase();
    const control = input.control || input.meta;
    if (control && key === 'b') {
      event.preventDefault();
      command('sidebar');
    } else if (control && input.shift && key === 'f') {
      event.preventDefault();
      ctx.toggleCinema();
    } else if (control && key === 'k') {
      event.preventDefault();
      command('quick');
    } else if (key === 'escape' && ctx.cinema) {
      ctx.cinema = false;
      ctx.send();
    }
  };
  wc.on('before-input-event', keyboard);
  desktop.on('before-input-event', keyboard);
  desktop.on('will-navigate', event => event.preventDefault());
  desktop.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Resizing fires continuously; the size is written once the user stops.
  let boundsTimer;
  const saveBounds = () => {
    clearTimeout(boundsTimer);
    boundsTimer = undefined;
    if (ctx.preferences.rememberWindow && !window.isFullScreen()) {
      config.set('window', window.getNormalBounds());
    }
  };
  window.on('resize', () => {
    clearTimeout(boundsTimer);
    boundsTimer = setTimeout(saveBounds, SAVE_BOUNDS_DELAY_MS);
  });
  window.on('close', event => {
    if (boundsTimer) saveBounds();
    if (ctx.preferences.minimizeToTray && !ctx.quitting) {
      event.preventDefault();
      window.hide();
    }
  });
  window.on('closed', () => {
    clearTimeout(boundsTimer);
    for (const dispose of ctx.disposers) dispose();
    ctx.presence.stop();
    if (!wc.isDestroyed()) wc.close();
  });
}

module.exports = { installDesktop };
