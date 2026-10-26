// SPDX-License-Identifier: MPL-2.0
// Original application: AlexAnimateMp4. See CREDITS.md.

// The site moves between domains; the active one is chosen in the settings.
const DEFAULT_DOMAIN = 'anime-sama.to';
// Official domains listed on anime-sama.pw. Links to any of them are rewritten to the
// active domain, so favorites and shared links survive a move.
const OFFICIAL_DOMAINS = [
  'anime-sama.si',
  'anime-sama.tv',
  'anime-sama.to',
  'anime-sama.org',
  'anime-sama.fr',
  'anime-sama.eu',
];
const DOMAIN_PATTERN = /^anime-sama\.[a-z]{2,24}$/;

let activeDomain = DEFAULT_DOMAIN;
const knownDomains = new Set(OFFICIAL_DOMAINS);

/**
 * Bare Anime Sama domain from user input such as "anime-sama.si" or
 * "https://www.anime-sama.si/catalogue/", or null when it is not one.
 * @param {unknown} value
 */
function normalizeDomain(value) {
  const text = String(value || '')
    .trim()
    .toLowerCase();
  if (!text) return null;
  try {
    const url = new URL(text.includes('://') ? text : `https://${text}`);
    if (url.protocol !== 'https:' || url.port || url.username || url.password) return null;
    const domain = url.hostname.replace(/^www\./, '');
    return DOMAIN_PATTERN.test(domain) ? domain : null;
  } catch {
    return null;
  }
}

const siteDomain = () => activeDomain;
const siteUrl = () => `https://${activeDomain}`;

/** Switches the active domain; the previous one stays known so its links still migrate. */
function setSiteDomain(value) {
  const domain = normalizeDomain(value);
  if (!domain) throw new Error(`Not an Anime Sama domain: ${value}`);
  knownDomains.add(activeDomain);
  knownDomains.add(domain);
  activeDomain = domain;
  return domain;
}

/** Adds domains found on anime-sama.pw; invalid entries are ignored. */
function addKnownDomains(values) {
  for (const value of values || []) {
    const domain = normalizeDomain(value);
    if (domain) knownDomains.add(domain);
  }
}

const bareHost = hostname => hostname.replace(/^www\./, '');

function isSiteUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      bareHost(url.hostname) === activeDomain &&
      !url.port &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

/** A link to another known Anime Sama domain, rewritten to the active one. */
function migrateSiteUrl(value) {
  try {
    const url = new URL(value);
    const host = bareHost(url.hostname);
    if (
      ['http:', 'https:'].includes(url.protocol) &&
      host !== activeDomain &&
      knownDomains.has(host) &&
      !url.port &&
      !url.username &&
      !url.password
    ) {
      return `${siteUrl()}${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    /* The caller handles invalid input. */
  }
  return value;
}
function isAborted(error) {
  return (
    error?.errno === -3 ||
    error?.code === 'ERR_ABORTED' ||
    /\bERR_ABORTED\b/.test(error?.message || '')
  );
}
// Install before the first request so startup and later link clicks are covered.
function installNavigation(webContents, onFailure) {
  let lastUrl = siteUrl();
  let showingError = false;
  let generation = 0;
  function fail(failure) {
    if (showingError || webContents.isDestroyed()) return;
    showingError = true;
    onFailure({ ...failure, url: failure.url || lastUrl });
  }
  webContents.on('did-start-navigation', (_event, url, _inPlace, isMainFrame) => {
    if (isMainFrame && isSiteUrl(url)) {
      lastUrl = url;
      showingError = false;
      generation++;
    }
  });
  webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
    if (!isMainFrame || !isSiteUrl(url) || code === -3) return;
    fail({ kind: 'network', code: String(code), description, url });
  });
  webContents.on('did-navigate', (_event, url, status, statusText) => {
    if (isSiteUrl(url) && status >= 400) {
      fail({
        kind: 'http',
        code: String(status),
        description: statusText || `HTTP ${status}`,
        url,
      });
    }
  });
  const navigation = {
    retry() {
      return navigation.load(lastUrl);
    },
    async load(value) {
      const url = migrateSiteUrl(value);
      if (!isSiteUrl(url)) throw new Error('Only Anime Sama HTTPS pages can load inside the app.');
      lastUrl = url;
      showingError = false;
      generation++;
      let promise;
      try {
        promise = webContents.loadURL(url);
      } catch (error) {
        promise = Promise.reject(error);
      }
      const activeGeneration = generation;
      try {
        await promise;
        return !showingError;
      } catch (error) {
        if (!isAborted(error) && activeGeneration === generation) {
          fail({
            kind: 'network',
            code: String(error.code || error.errno || 'LOAD_FAILED'),
            description: error.message || 'The page could not be loaded.',
            url,
          });
        }
        return false;
      }
    },
  };
  return navigation;
}
module.exports = {
  DEFAULT_DOMAIN,
  OFFICIAL_DOMAINS,
  normalizeDomain,
  siteDomain,
  siteUrl,
  setSiteDomain,
  addKnownDomains,
  isSiteUrl,
  migrateSiteUrl,
  isAborted,
  installNavigation,
};
