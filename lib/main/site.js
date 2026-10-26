// SPDX-License-Identifier: MPL-2.0
// The Anime Sama view: navigation guards, page metadata, favorites and playback tracking.
const { ipcMain } = require('electron');
const { join } = require('node:path');
const { siteUrl, isSiteUrl, migrateSiteUrl, installNavigation } = require('../navigation');
const { isAnime, favoriteEntry, normalizeFavorites } = require('../library');
const { sampleFrames, seekFrame, progressKey } = require('../playback');
const { createWebsiteStyler } = require('../website');
const { isAdUrl } = require('../ads');
const { cleanText } = require('../text');

const PLAYBACK_SAMPLE_MS = 3000;
// Redirect chains (typically ads) must not open a burst of browser tabs.
const EXTERNAL_COOLDOWN_MS = 3000;
const MAX_RECENT = 40;
const MAX_FAVORITES = 100;
// A saved position is only restored when it is meaningful and the player is near the start.
const RESUME_MIN_S = 10;
const RESUME_END_MARGIN_S = 15;
const RESUME_PLAYER_START_S = 5;
const SAVE_MIN_S = 2;

const blankPage = url => ({
  title: 'Anime Sama',
  url,
  episode: '',
  season: '',
  language: '',
  playing: false,
});

/** @param {import('./context').Context} ctx */
function installSite(ctx) {
  const { wc, libraryStore } = ctx;
  let sampling = false;
  let restoredKey = '';
  const styler = createWebsiteStyler(wc, join(__dirname, '../../assets/fonts/Beckman-FREE.otf'));
  const navigation = installNavigation(wc, failure => {
    ctx.error = failure;
    ctx.discoverDomain?.();
    ctx.loading = false;
    ctx.page.playing = false;
    ctx.visibility();
    ctx.updateRpc();
    ctx.send();
  });

  ctx.navigate = async url => {
    const migrated = migrateSiteUrl(url);
    if (!isSiteUrl(migrated)) return false;
    ctx.error = null;
    ctx.loading = true;
    ctx.panel = false;
    ctx.visibility();
    ctx.send();
    return navigation.load(migrated);
  };
  ctx.reload = () => ctx.navigate(ctx.error?.url || ctx.page.url || siteUrl());
  ctx.restyle = () => styler.applyCss(ctx.preferences);

  let lastExternal = 0;
  const openFromSite = url => {
    const now = Date.now();
    if (now - lastExternal < EXTERNAL_COOLDOWN_MS) return;
    lastExternal = now;
    if (!ctx.preferences.blockAds || !isAdUrl(url)) ctx.openExternal(url);
  };

  wc.on('will-navigate', (event, url) => {
    const migrated = migrateSiteUrl(url);
    if (migrated !== url) {
      event.preventDefault();
      ctx.navigate(migrated);
    } else if (!isSiteUrl(url)) {
      event.preventDefault();
      openFromSite(url);
    }
  });
  wc.on('will-redirect', (event, url) => {
    if (isSiteUrl(url)) return;
    event.preventDefault();
    // The site itself sending us to another official domain means it has moved.
    // Following it silently would loop with the domain rewrite, so the user picks.
    if (migrateSiteUrl(url) !== url) {
      ctx.error = {
        kind: 'domain',
        code: new URL(url).hostname.replace(/^www\./, ''),
        description: ctx.t('domainMoved'),
        url: ctx.page.url,
      };
      ctx.loading = false;
      ctx.visibility();
      ctx.send();
      return;
    }
    // Automatic external redirects must never launch browser ads.
  });
  wc.setWindowOpenHandler(({ url }) => {
    if (isSiteUrl(url)) ctx.navigate(url);
    return { action: 'deny' };
  });
  wc.on('will-attach-webview', event => event.preventDefault());
  wc.on('did-start-navigation', (_event, url, _inPlace, isMainFrame) => {
    if (!isMainFrame || !isSiteUrl(url)) return;
    ctx.error = null;
    ctx.loading = true;
    ctx.cinema = false;
    ctx.page = blankPage(url);
    restoredKey = '';
    ctx.scheduleRpc();
    ctx.visibility();
    ctx.send();
  });
  wc.on('dom-ready', () => {
    styler.injectFont();
    styler.applyCss(ctx.preferences);
  });
  wc.on('did-finish-load', () => {
    ctx.loading = false;
    if (ctx.pendingResume?.url === wc.getURL()) {
      wc.send('samani:resume-episode', ctx.pendingResume.episode);
      ctx.pendingResume = null;
    }
    ctx.send();
  });
  wc.on('media-started-playing', () => {
    ctx.page.playing = isAnime(ctx.page) && Boolean(ctx.page.episode);
    if (ctx.page.playing) ctx.page.hasPlayback = true;
    ctx.scheduleRpc();
    ctx.send();
  });
  wc.on('media-paused', () => {
    ctx.page.playing = false;
    ctx.scheduleRpc();
    ctx.send();
  });
  wc.on('render-process-gone', () => {
    ctx.error = {
      kind: 'network',
      code: 'RENDERER_EXIT',
      description: ctx.t('rendererExit'),
      url: ctx.page.url,
    };
    ctx.visibility();
    ctx.send();
  });

  // Only the top Anime Sama document of this view may report metadata.
  const fromSite = event =>
    !wc.isDestroyed() &&
    event.sender === wc &&
    event.senderFrame &&
    event.senderFrame === wc.mainFrame &&
    isSiteUrl(event.senderFrame.url);

  ipcMain.on('samani:page', (event, data) => {
    if (!fromSite(event) || !data || !isSiteUrl(data.url)) return;
    const text = value => cleanText(value, 240);
    if (ctx.page.episode !== text(data.episode)) {
      ctx.page = {
        ...ctx.page,
        time: undefined,
        duration: undefined,
        playing: false,
        hasPlayback: false,
      };
    }
    ctx.page = {
      ...ctx.page,
      url: data.url,
      title: text(data.title) || 'Anime Sama',
      episode: text(data.episode),
      season: text(data.season),
      language: text(data.language),
      episodeTitle: text(data.episodeTitle),
      anime: data.anime === true,
      image: /^https:\/\//.test(data.image || '') ? String(data.image).slice(0, 1000) : '',
    };
    if (isAnime(ctx.page) && ctx.page.episode && !ctx.error) {
      const { url, title, episode, image, season } = ctx.page;
      const entry = { url, title, episode, image, anime: true, season, updatedAt: Date.now() };
      const others = libraryStore.get('recent', []).filter(item => item.url !== url);
      libraryStore.set('recent', [entry, ...others].slice(0, MAX_RECENT));
    }
    ctx.scheduleRpc();
    ctx.send();
  });

  ipcMain.on('samani:site-favorite', (event, data) => {
    if (!fromSite(event) || data?.url !== ctx.page.url || !isAnime(ctx.page)) return;
    const entry = favoriteEntry(ctx.page);
    const items = normalizeFavorites(libraryStore.get('favorites', [])).filter(
      item => item.id !== entry.id
    );
    if (data.added === true) items.unshift(entry);
    libraryStore.set('favorites', items.slice(0, MAX_FAVORITES));
    ctx.send();
  });

  // Reads the player every few seconds to save and restore the position of each episode.
  const samplePlayback = async () => {
    const { page } = ctx;
    if (sampling || wc.isDestroyed() || !isAnime(page) || !isSiteUrl(wc.getURL())) return;
    if (!new URL(page.url).pathname.startsWith('/catalogue/')) return;
    sampling = true;
    try {
      const sample = await sampleFrames(wc);
      if (!sample || page.url !== ctx.page.url) return;
      const key = progressKey(ctx.page);
      const { time, duration, rate, paused } = sample.value;
      if (restoredKey !== key) {
        restoredKey = key;
        const saved = ctx.progress.get(key);
        const resumable =
          saved &&
          saved.time > RESUME_MIN_S &&
          saved.time < saved.duration - RESUME_END_MARGIN_S &&
          time < RESUME_PLAYER_START_S;
        if (resumable) {
          await seekFrame(sample.frame, saved.time);
          return;
        }
      }
      ctx.page = { ...ctx.page, time, duration, rate, playing: !paused, hasPlayback: true };
      if (time > SAVE_MIN_S) ctx.progress.save(key, time, duration);
      ctx.scheduleRpc();
      ctx.send();
    } catch {
      /* Frames can disappear while they are being sampled. */
    } finally {
      sampling = false;
    }
  };
  const playbackTimer = setInterval(samplePlayback, PLAYBACK_SAMPLE_MS);
  playbackTimer.unref();
  ctx.disposers.push(() => clearInterval(playbackTimer));
}

module.exports = { installSite, blankPage, MAX_FAVORITES };
