// SPDX-License-Identifier: MPL-2.0
// Discover addresses without changing the user's selected website.
const { net } = require('electron');
const { scanDomains, SCAN_COOLDOWN_MS } = require('../domains');
const { addKnownDomains } = require('../navigation');
const AUTO_SCAN_MS = 24 * 60 * 60 * 1000;

function installDiscovery(ctx) {
  let pending;
  let lastAutoAttempt = 0;
  ctx.scanDomains = () => {
    if (pending) return pending;
    const previous = ctx.config.get('domainScan', null);
    if (previous && Date.now() - previous.ts < SCAN_COOLDOWN_MS) return Promise.resolve();
    ctx.domainScanning = true;
    ctx.domainScanError = false;
    ctx.send();
    pending = (async () => {
      try {
        const scan = await scanDomains({ fetcher: (url, options) => net.fetch(url, options) });
        ctx.config.set('domainScan', scan);
        addKnownDomains(scan.results.map(result => result.domain));
      } catch {
        ctx.domainScanError = true;
        throw new Error(ctx.t('domainScanError'));
      } finally {
        ctx.domainScanning = false;
        pending = null;
        ctx.send();
      }
    })();
    return pending;
  };
  ctx.discoverDomain = () => {
    if (!ctx.preferences.autoDomain || Date.now() - lastAutoAttempt < SCAN_COOLDOWN_MS) return;
    lastAutoAttempt = Date.now();
    ctx.scanDomains().catch(() => {});
  };
  const timer = setInterval(ctx.discoverDomain, AUTO_SCAN_MS);
  timer.unref();
  ctx.disposers.push(() => clearInterval(timer));
}

module.exports = { installDiscovery };
