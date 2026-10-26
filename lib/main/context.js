// SPDX-License-Identifier: MPL-2.0
// Shared state of the running app and the helpers every main-process module relies on.
const { shell } = require('electron');
const { presets } = require('../preferences');
const { siteUrl, siteDomain } = require('../navigation');
const { animeIdentity, isAnime, normalizeFavorites } = require('../library');
const { buildActivity } = require('../presence');
const { displayVersion } = require('../version');
const { blankPage } = require('./site');

const RPC_DEBOUNCE_MS = 1000;
const dictionaries = {
  fr: require('../../desktop/i18n/fr.json'),
  en: require('../../desktop/i18n/en.json'),
  ja: require('../../desktop/i18n/ja.json'),
};

/**
 * @typedef {ReturnType<typeof createContext>} Context
 * Navigation helpers (`navigate`, `reload`, `restyle`) are added by `installSite`,
 * `refreshMenus` by `installMenus`.
 */

/**
 * @param {object} options
 * @param {Electron.BrowserWindow} options.window
 * @param {Electron.WebContentsView} options.site
 * @param {import('electron-store')} options.config
 * @param {import('electron-store')} options.libraryStore
 * @param {ReturnType<import('../progress').createProgress>} options.progress
 * @param {ReturnType<import('../media').createMediaStore>} options.media
 * @param {import('../presence').Presence} options.presence
 * @param {object} options.preferences
 * @param {object} options.pkg
 */
function createContext({
  window,
  site,
  config,
  libraryStore,
  progress,
  media,
  presence,
  preferences,
  pkg,
}) {
  const repository = pkg.repository.url.replace(/\.git$/, '');
  let rpcTimer;
  const ctx = {
    window,
    site,
    wc: site.webContents,
    config,
    libraryStore,
    progress,
    media,
    presence,
    pkg,
    repository,
    preferences,
    page: blankPage(siteUrl()),
    error: null,
    loading: true,
    panel: false,
    intro: preferences.intro,
    cinema: false,
    guiding: false,
    // Updated by the desktop renderer with the area left for the website.
    bounds: { x: 244, y: 88, width: 1100, height: 730 },
    since: Date.now(),
    quitting: false,
    ready: false,
    pendingResume: null,
    domainScanning: false,
    /** @type {Array<() => void>} */
    disposers: [],
    updates: { state: () => ({ status: 'unsupported' }), action: async () => ({}) },
    navigate: async _url => false,
    reload: () => {},
    restyle: () => {},
    refreshMenus: () => {},

    t: key => dictionaries[ctx.preferences.language][key] || key,
    canCinema: () => isAnime(ctx.page) && Boolean(ctx.page.episode) && !ctx.error,
    toggleCinema() {
      ctx.cinema = ctx.canCinema() && !ctx.cinema;
      ctx.send();
    },
    state: () => ({
      preferences: ctx.preferences,
      presets,
      page: ctx.page,
      error: ctx.error,
      loading: ctx.loading,
      cinema: ctx.cinema && ctx.canCinema(),
      canFavorite: isAnime(ctx.page) && !ctx.error && !ctx.loading,
      canCinema: ctx.canCinema(),
      needsGuide: !config.get('guideV1Complete', false),
      panel: ctx.panel,
      rpcStatus: presence.status,
      update: ctx.updates.state(),
      favorites: normalizeFavorites(libraryStore.get('favorites', [])),
      recent: libraryStore
        .get('recent', [])
        .filter(item => animeIdentity(item.url) && item.episode),
      domain: siteDomain(),
      domainScan: config.get('domainScan', null),
      domainScanning: ctx.domainScanning,
      domainScanError: ctx.domainScanError || false,
      version: pkg.version,
      displayVersion: displayVersion(pkg.version),
      repository,
      dictionary: dictionaries[ctx.preferences.language],
      mediaUrl: ctx.preferences.media ? `samani-media://background/${ctx.preferences.media}` : null,
    }),
    send() {
      if (ctx.ready && !window.isDestroyed()) window.webContents.send('samani:state', ctx.state());
    },
    // The website view only shows when no overlay, error or intro covers it.
    visibility() {
      if (ctx.wc.isDestroyed()) return;
      const { bounds } = ctx;
      site.setBounds(bounds);
      const covered = ctx.guiding || ctx.panel || ctx.error || ctx.intro;
      site.setVisible(!covered && bounds.width > 0 && bounds.height > 0);
    },
    updateRpc() {
      clearTimeout(rpcTimer);
      presence.configure(ctx.preferences.rpcEnabled, pkg.DISCORD_CLIENT_ID);
      presence.update(buildActivity(ctx.page, ctx.preferences, ctx.since, repository));
    },
    scheduleRpc() {
      clearTimeout(rpcTimer);
      rpcTimer = setTimeout(ctx.updateRpc, RPC_DEBOUNCE_MS);
      rpcTimer.unref?.();
    },
    openExternal(url) {
      if (/^https:\/\//.test(url)) shell.openExternal(url).catch(() => {});
    },
    focus() {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    },
  };
  ctx.disposers.push(() => clearTimeout(rpcTimer));
  return ctx;
}

module.exports = { createContext };
