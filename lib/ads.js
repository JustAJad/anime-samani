// SPDX-License-Identifier: MPL-2.0
// A small, inspectable list: never block all third-party resources or player frames.
const AD_HOSTS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adsterra.com',
  'popads.net',
  'popcash.net',
  'exoclick.com',
  'onclicka.com',
  'onclck.com',
];
function isAdUrl(value) {
  try {
    const host = new URL(value).hostname;
    return AD_HOSTS.some(domain => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}
function installAdFilter(ctx) {
  const requests = ctx.wc.session.webRequest;
  requests.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
    callback({
      cancel:
        details.webContentsId === ctx.wc.id && ctx.preferences.blockAds && isAdUrl(details.url),
    });
  });
  ctx.disposers.push(() => requests.onBeforeRequest(null));
}
const AD_SELECTORS =
  '.adsbygoogle,[data-ad-slot],[data-samani-ad],.asn-ad,.asn-ads,.ad-banner,.ad-container,.advertisement,iframe[src*="doubleclick.net"],iframe[src*="googlesyndication.com"]';
module.exports = { isAdUrl, installAdFilter, AD_SELECTORS };
