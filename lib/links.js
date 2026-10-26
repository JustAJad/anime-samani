// SPDX-License-Identifier: MPL-2.0
const { isSiteUrl, migrateSiteUrl } = require('./navigation');
const { animeIdentity } = require('./library');
const BRIDGE = 'https://justajad.github.io/anime-samani/open/';
function appLink(url, language = 'fr', episode = '') {
  if (!isSiteUrl(url)) throw new Error('Only Anime Sama links are allowed');
  const query = new URLSearchParams({ url, lang: language });
  if (episode) query.set('episode', String(episode).slice(0, 160));
  return BRIDGE + '?' + query;
}
function parseAppLink(value) {
  try {
    const uri = new URL(value);
    if (uri.protocol !== 'anime-samani:' || uri.hostname !== 'open') return null;
    // Links shared before a domain move still open on the active domain.
    const url = migrateSiteUrl(uri.searchParams.get('url'));
    if (!isSiteUrl(url)) return null;
    return {
      url,
      episode: animeIdentity(url) ? (uri.searchParams.get('episode') || '').slice(0, 160) : '',
    };
  } catch {
    return null;
  }
}
module.exports = { appLink, parseAppLink };
