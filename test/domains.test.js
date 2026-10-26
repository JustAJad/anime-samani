const { test } = require('node:test');
const assert = require('node:assert/strict');
const navigation = require('../lib/navigation');
const { parsePortal, scanDomains, PORTAL_URL } = require('../lib/domains');
const { animeIdentity, normalizeFavorites } = require('../lib/library');
const { parseAppLink } = require('../lib/links');
const { sanitize, defaults } = require('../lib/preferences');

// Shape of anime-sama.pw: an official button, a script list and scam domains as plain text.
const portal = `
  <a class="btn-primary" href="https://anime-sama.si">Accéder à Anime-Sama</a>
  <ul><li>anime-sama.com</li><li>anime-sama.net</li></ul>
  <script>
    const domains = [
      { name: 'anime-sama.si' },
      { name: 'anime-sama.to' },
      { name: "anime-sama.fr" }, // spécial
      { name: 'evil.example' },
    ];
  </script>`;

test('domains typed by hand are normalised and anything else is refused', () => {
  const { normalizeDomain } = navigation;
  for (const value of [
    'anime-sama.si',
    ' ANIME-SAMA.SI ',
    'www.anime-sama.si',
    'https://anime-sama.si/catalogue/x/',
  ]) {
    assert.equal(normalizeDomain(value), 'anime-sama.si', value);
  }
  for (const value of [
    '',
    null,
    'http://anime-sama.si',
    'anime-sama.si:8080',
    'user@anime-sama.si',
    'anime-sama.org.uk',
    'fake-anime-sama.si',
    'anime-sama.si.evil.test',
    'javascript:alert(1)',
  ]) {
    assert.equal(normalizeDomain(value), null, String(value));
  }
  assert.equal(sanitize({ domain: 'www.anime-sama.si' }).domain, 'anime-sama.si');
  assert.equal(sanitize({ domain: 'evil.test' }).domain, defaults.domain);
});

test('portal parsing keeps the official list and ignores scam or foreign domains', () => {
  assert.deepEqual(parsePortal(portal), {
    official: 'anime-sama.si',
    domains: ['anime-sama.si', 'anime-sama.to', 'anime-sama.fr'],
  });
  assert.equal(
    parsePortal("<a href='https://anime-sama.si' class='btn-primary'>Go</a>").official,
    'anime-sama.si'
  );
  assert.deepEqual(parsePortal('<p>nothing</p>'), { official: null, domains: [] });
});

test('scan checks each listed domain and sorts working ones first', async () => {
  const statuses = { 'anime-sama.si': 'redirect', 'anime-sama.to': 'online' };
  const requested = [];
  const fetcher = async url => {
    requested.push(url);
    if (url === PORTAL_URL) return new Response(portal);
    const domain = new URL(url).searchParams.get('check');
    if (domain === 'anime-sama.fr') return new Response('busy', { status: 503 });
    return Response.json({ status: statuses[domain], code: 200 });
  };
  const scan = await scanDomains({ fetcher, sleep: async () => {} });
  assert.equal(scan.official, 'anime-sama.si');
  assert.deepEqual(scan.results, [
    { domain: 'anime-sama.to', status: 'online' },
    { domain: 'anime-sama.si', status: 'redirect' },
    { domain: 'anime-sama.fr', status: 'unknown' },
  ]);
  assert.equal(requested.length, 4);
  await assert.rejects(
    scanDomains({ fetcher: async () => new Response('', { status: 500 }) }),
    /HTTP 500/
  );
  await assert.rejects(
    scanDomains({ fetcher: async () => new Response('<p></p>') }),
    /lists no domain/
  );
});

test('switching domain migrates links, favorites and shared links', () => {
  const { setSiteDomain, siteUrl, isSiteUrl, migrateSiteUrl, addKnownDomains } = navigation;
  try {
    assert.equal(setSiteDomain('https://www.anime-sama.si/'), 'anime-sama.si');
    assert.equal(siteUrl(), 'https://anime-sama.si');
    assert.ok(isSiteUrl('https://anime-sama.si/catalogue/'));
    assert.ok(!isSiteUrl('https://anime-sama.to/catalogue/'));
    // The previous domain and the official ones migrate; unknown lookalikes do not.
    assert.equal(
      migrateSiteUrl('https://anime-sama.to/catalogue/frieren/?a=1#b'),
      'https://anime-sama.si/catalogue/frieren/?a=1#b'
    );
    assert.equal(migrateSiteUrl('https://anime-sama.com/x'), 'https://anime-sama.com/x');
    addKnownDomains(['anime-sama.new', 'not a domain']);
    assert.equal(migrateSiteUrl('https://anime-sama.new/x'), 'https://anime-sama.si/x');

    const old = 'https://anime-sama.to/catalogue/frieren/saison1/vostfr/';
    assert.equal(animeIdentity(old).url, 'https://anime-sama.si/catalogue/frieren/');
    assert.equal(normalizeFavorites([{ url: old, anime: true }])[0].id, 'frieren');
    const link = parseAppLink('anime-samani://open?' + new URLSearchParams({ url: old }));
    assert.equal(link.url, 'https://anime-sama.si/catalogue/frieren/saison1/vostfr/');
    assert.throws(() => setSiteDomain('evil.test'), /Not an Anime Sama domain/);
    assert.equal(siteUrl(), 'https://anime-sama.si');
  } finally {
    setSiteDomain(navigation.DEFAULT_DOMAIN);
  }
});
