// SPDX-License-Identifier: MPL-2.0
const { isSiteUrl, migrateSiteUrl, siteUrl } = require('./navigation');
/** The show behind a catalogue URL, on any known domain, rebuilt on the active domain. */
function animeIdentity(value) {
  const url = migrateSiteUrl(value);
  if (!isSiteUrl(url)) return null;
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  if (
    parts[0] !== 'catalogue' ||
    !parts[1] ||
    parts.some(part => /^(?:scan|scans|manga|chapitre)/i.test(part))
  )
    return null;
  if (parts.length > 2 && !/^(?:saison\d+|film|films|oav|ova|special)/i.test(parts[2])) return null;
  return {
    id: parts[1],
    url: `${siteUrl()}/catalogue/${parts[1]}/`,
    image: `https://cdn.jsdelivr.net/gh/Anime-Sama/IMG@img/contenu/${encodeURIComponent(parts[1])}.jpg`,
  };
}
function isAnime(page) {
  return Boolean(page?.anime && animeIdentity(page.url));
}
function favoriteEntry(page) {
  const show = animeIdentity(page.url);
  return isAnime(page)
    ? {
        ...show,
        title: page.title,
        image: page.image || show.image,
        anime: true,
        updatedAt: Date.now(),
      }
    : null;
}
function normalizeFavorites(items) {
  const result = new Map();
  for (const item of items) {
    const show = animeIdentity(item.url);
    if (
      !show ||
      (!item.anime && !/\/(saison\d+|film|films|oav|ova|special)/i.test(new URL(item.url).pathname))
    )
      continue;
    result.set(show.id, { ...item, ...show, image: item.image || show.image, anime: true });
  }
  return [...result.values()];
}
module.exports = { animeIdentity, isAnime, favoriteEntry, normalizeFavorites };
