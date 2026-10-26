// SPDX-License-Identifier: MPL-2.0
// Page metadata and limited favorite/episode controls; no native API is exposed.
// Sandboxed preloads cannot require local modules, so everything lives in this file.
const { ipcRenderer } = require('electron');

// Every Anime Sama selector in one place: update here when the site markup changes.
const SELECTORS = {
  title: ['h1', '#titreOeuvre', '.asn-title'],
  // Lists are tried in order; the first non-empty match wins.
  episodeSelect: ['#selectEpisodes', '#select_episodes', 'select[name*="episode"]'],
  savedEpisode: ['#savedEpisodeId', '#savedChapitreId'],
  episodeTitle: '#episodeTitle,.episode-title',
  cover: '#coverOeuvre,img.cover,.asn-cover img',
  ogImage: 'meta[property="og:image"]',
  favoriteButton: '#addFavoris,[data-action="favorite"],button[aria-label*="favori" i]',
  favoriteMark: '#checkedFavoris',
  addedMetadata: 'h1,select,img,a[href]',
  nestedMetadata: 'h1,select,#coverOeuvre,a[href*="saison"]',
};
const COVER_CDN = 'https://cdn.jsdelivr.net/gh/Anime-Sama/IMG@img/contenu/';
const REPORT_DELAY_MS = 180;
const FAVORITE_SETTLE_MS = 300;

const onSite =
  process.isMainFrame &&
  location.protocol === 'https:' &&
  /^anime-sama\.[a-z]{2,24}$/.test(location.hostname.replace(/^www\./, ''));

function firstText(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (!element) continue;
    const value =
      element.tagName === 'SELECT' ? element.selectedOptions[0]?.textContent : element.textContent;
    if (value?.trim()) return value.trim();
  }
  return '';
}

function isAnimePage(parts, slug) {
  if (!slug || parts.some(part => /^(scan|scans|manga|chapitre)/i.test(part))) return false;
  if (document.querySelector(SELECTORS.episodeSelect.join(','))) return true;
  return [...document.querySelectorAll('a[href]')].some(link => {
    const path = new URL(link.href).pathname;
    return path.startsWith(`/catalogue/${slug}/`) && /\/(saison\d+|film|oav)/i.test(path);
  });
}

function coverImage(slug) {
  const cover = document.querySelector(SELECTORS.cover)?.src;
  if (cover) return cover;
  const og = document.querySelector(SELECTORS.ogImage)?.content;
  if (og?.includes('/contenu/')) return og;
  return slug ? `${COVER_CDN}${encodeURIComponent(slug)}.jpg` : '';
}

function readPage() {
  const parts = location.pathname.split('/').filter(Boolean);
  const slug = parts[0] === 'catalogue' ? parts[1] : '';
  const episode = firstText([...SELECTORS.episodeSelect, ...SELECTORS.savedEpisode]);
  return {
    url: location.href,
    title: firstText(SELECTORS.title) || document.title.split('|')[0].trim() || slug,
    episode,
    season: parts.find(part => /^saison\d+/i.test(part))?.replace(/^saison/i, 'S') || '',
    anime: isAnimePage(parts, slug),
    language: parts.find(part => /^(vf|vostfr|vo)$/i.test(part))?.toUpperCase() || '',
    episodeTitle:
      document.querySelector(SELECTORS.episodeTitle)?.textContent ||
      episode.replace(/^(?:épisode|episode|ep)\s*\d+(?:[.,]\d+)?\s*[-:–]?\s*/i, ''),
    image: coverImage(slug),
  };
}

function markAdvertisements() {
  for (const label of document.querySelectorAll('h2,h3,h4,p,span')) {
    if (!/^(publicité|publicite|advertisement|sponsored)$/i.test(label.textContent.trim()))
      continue;
    const slot = label.parentElement;
    if (
      slot &&
      slot.querySelector('a[href],iframe,ins') &&
      !slot.querySelector('video,select,form')
    )
      slot.setAttribute('data-samani-ad', '');
  }
}

function installMetadata() {
  let timer;
  const report = () => {
    clearTimeout(timer);
    timer = setTimeout(() => ipcRenderer.send('samani:page', readPage()), REPORT_DELAY_MS);
  };
  const addsMetadata = node =>
    node.nodeType === Node.ELEMENT_NODE &&
    (node.matches(SELECTORS.addedMetadata) || node.querySelector(SELECTORS.nestedMetadata));
  addEventListener('DOMContentLoaded', () => {
    markAdvertisements();
    report();
    document.addEventListener('change', report, true);
    const observer = new MutationObserver(report);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    const saved = document.querySelector(SELECTORS.savedEpisode.join(','));
    if (saved) observer.observe(saved, { childList: true, subtree: true });
    const bodyObserver = new MutationObserver(records => {
      markAdvertisements();
      if (records.some(record => [...record.addedNodes].some(addsMetadata))) report();
    });
    if (document.body) bodyObserver.observe(document.body, { childList: true, subtree: true });
  });
  addEventListener('popstate', report);
  ipcRenderer.on('samani:resume-episode', (_event, episode) => {
    const select = document.querySelector(SELECTORS.episodeSelect.join(','));
    const option = select && [...select.options].find(item => item.textContent.trim() === episode);
    if (!option) return;
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    report();
  });
}

function installFavorites() {
  const favoriteButton = () => document.querySelector(SELECTORS.favoriteButton);
  const isActive = button => {
    if (button?.getAttribute('aria-pressed') === 'true') return true;
    const mark = button?.querySelector(SELECTORS.favoriteMark);
    if (!mark || mark.hidden) return false;
    const style = getComputedStyle(mark);
    return style.display !== 'none' && style.visibility !== 'hidden';
  };
  document.addEventListener(
    'click',
    event => {
      const button = favoriteButton();
      if (!button?.contains(event.target)) return;
      // Let the site update its own button before reading the new state.
      setTimeout(() => {
        ipcRenderer.send('samani:site-favorite', {
          url: location.href,
          title: document.querySelector('h1')?.textContent || document.title,
          added: isActive(button),
        });
      }, FAVORITE_SETTLE_MS);
    },
    true
  );
  ipcRenderer.on('samani:favorite-request', (_event, data) => {
    if (data.url !== location.href) return;
    const button = favoriteButton();
    if (button && isActive(button) !== data.added) button.click();
  });
}

if (onSite) {
  installMetadata();
  installFavorites();
}
