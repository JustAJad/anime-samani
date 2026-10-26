// SPDX-License-Identifier: MPL-2.0
// Reads the official domain list published on anime-sama.pw and its status checker.
const { normalizeDomain } = require('./navigation');

const PORTAL_URL = 'https://anime-sama.pw/';
const REQUEST_TIMEOUT_MS = 8000;
// Same pace as the portal's own page, to stay polite with its checker.
const DELAY_BETWEEN_CHECKS_MS = 300;
// Rescans within this window reuse the previous result.
const SCAN_COOLDOWN_MS = 5 * 60 * 1000;
const STATUSES = ['online', 'redirect', 'offline'];
const STATUS_ORDER = { online: 0, redirect: 1, offline: 2, unknown: 3 };

/**
 * Domains named on the portal page: its "official link" button and the list its status
 * table is built from. Scam domains are only shown as plain text there, so they never match.
 * @param {string} html
 * @returns {{official: string|null, domains: string[]}}
 */
function parsePortal(html) {
  const text = String(html || '');
  const button = [...text.matchAll(/<a\b[^>]*>/gi)].find(([tag]) =>
    /\bclass\s*=\s*["'][^"']*\bbtn-primary\b[^"']*["']/i.test(tag)
  );
  const href = button && /\bhref\s*=\s*["']([^"']+)["']/i.exec(button[0]);
  const official = href ? normalizeDomain(href[1]) : null;
  const listed = [...text.matchAll(/\{\s*name:\s*['"]([^'"]+)['"]\s*\}/g)].map(match =>
    normalizeDomain(match[1])
  );
  const domains = [...new Set([official, ...listed].filter(Boolean))];
  return { official, domains };
}

/**
 * @param {typeof fetch} fetcher
 * @param {string} domain
 * @returns {Promise<'online'|'redirect'|'offline'|'unknown'>}
 */
async function checkDomain(fetcher, domain) {
  try {
    const url = `${PORTAL_URL}?check=${encodeURIComponent(domain)}&_=${Date.now()}`;
    const response = await fetcher(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return 'unknown';
    const { status } = await response.json();
    return STATUSES.includes(status) ? status : 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Fetches the portal, then checks every listed domain one after the other.
 * Throws when the portal itself cannot be read or lists nothing.
 * @param {object} [options]
 * @param {typeof fetch} [options.fetcher]
 * @param {(ms: number) => Promise<void>} [options.sleep]
 * @returns {Promise<{ts: number, official: string|null, results: Array<{domain: string, status: string}>}>}
 */
async function scanDomains({
  fetcher = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
} = {}) {
  const response = await fetcher(PORTAL_URL, {
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`anime-sama.pw answered HTTP ${response.status}`);
  const { official, domains } = parsePortal(await response.text());
  if (!domains.length) throw new Error('anime-sama.pw lists no domain');
  const results = [];
  for (const [index, domain] of domains.slice(0, 24).entries()) {
    if (index) await sleep(DELAY_BETWEEN_CHECKS_MS);
    results.push({ domain, status: await checkDomain(fetcher, domain) });
  }
  // Stable sort: working domains first, in the portal's own order.
  results.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  return { ts: Date.now(), official, results };
}

module.exports = { PORTAL_URL, SCAN_COOLDOWN_MS, parsePortal, checkDomain, scanDomains };
