const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { siteUrl, isSiteUrl, migrateSiteUrl, installNavigation } = require('../lib/navigation');

const SITE_URL = siteUrl();

class Page extends EventEmitter {
  isDestroyed() {
    return false;
  }
  loadURL(url) {
    this.emit('did-start-navigation', {}, url, false, true);
    return this.request ? this.request(url) : Promise.resolve();
  }
}
function setup() {
  const page = new Page();
  const failures = [];
  return { page, failures, navigation: installNavigation(page, failure => failures.push(failure)) };
}

test('current domain accepts HTTPS pages and excludes lookalikes and unsafe protocols', () => {
  for (const url of [
    SITE_URL,
    `${SITE_URL}/catalogue/test/saison1/vostfr/`,
    'https://www.anime-sama.to/',
  ])
    assert.equal(isSiteUrl(url), true);
  for (const url of [
    'https://anime-sama.to.attacker.test',
    'http://anime-sama.to',
    'javascript:alert(1)',
    'file:///tmp/error.html',
    'https://attacker.test',
    'https://x@anime-sama.to',
    'https://anime-sama.to:8443',
    'bad URL',
  ])
    assert.equal(isSiteUrl(url), false, url);
});

test('old domain migration preserves the full content path, search and fragment', () => {
  assert.equal(
    migrateSiteUrl('https://anime-sama.fr/catalogue/test/?ep=5#player'),
    'https://anime-sama.to/catalogue/test/?ep=5#player'
  );
  assert.equal(migrateSiteUrl('http://www.anime-sama.fr/profil/'), 'https://anime-sama.to/profil/');
  assert.equal(
    migrateSiteUrl('https://anime-sama.fr.attacker.test/'),
    'https://anime-sama.fr.attacker.test/'
  );
});

test('initial DNS failure preserves the network code instead of inventing HTTP 500', async () => {
  const { page, failures, navigation } = setup();
  page.request = async () => {
    throw Object.assign(new Error('ERR_NAME_NOT_RESOLVED'), {
      code: 'ERR_NAME_NOT_RESOLVED',
      errno: -105,
    });
  };
  assert.equal(await navigation.load(SITE_URL), false);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].kind, 'network');
  assert.equal(failures[0].code, 'ERR_NAME_NOT_RESOLVED');
});

test('the Electron event and promise rejection display one recovery page', async () => {
  const { page, failures, navigation } = setup();
  page.request = async url => {
    page.emit('did-fail-load', {}, -106, 'ERR_INTERNET_DISCONNECTED', url, true);
    throw Object.assign(new Error('ERR_INTERNET_DISCONNECTED'), { errno: -106 });
  };
  await navigation.load(SITE_URL);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].code, '-106');
});

test('actual startup HTTP 500 is identified as a server response', async () => {
  const { page, failures, navigation } = setup();
  page.request = async url => {
    page.emit('did-navigate', {}, url, 500, 'Internal Server Error');
  };
  assert.equal(await navigation.load(SITE_URL), false);
  assert.deepEqual(failures, [
    { kind: 'http', code: '500', description: 'Internal Server Error', url: SITE_URL },
  ]);
});

test('a real HTTP error after clicking a link is also caught', () => {
  const { page, failures } = setup();
  const url = `${SITE_URL}/catalogue/test/`;
  page.emit('did-start-navigation', {}, url, false, true);
  page.emit('did-navigate', {}, url, 503, 'Service Unavailable');
  assert.equal(failures[0].code, '503');
  assert.equal(failures[0].url, url);
});

test('failed video subframes do not replace the website', () => {
  const { page, failures } = setup();
  page.emit('did-fail-load', {}, -105, 'ERR_NAME_NOT_RESOLVED', `${SITE_URL}/video`, false);
  page.emit('did-fail-load', {}, -105, 'ERR_NAME_NOT_RESOLVED', 'https://video.example/', true);
  assert.equal(failures.length, 0);
});

test('cancelled navigation and ERR_ABORTED promise rejections are ignored', async () => {
  const { page, failures, navigation } = setup();
  page.request = async url => {
    page.emit('did-fail-load', {}, -3, 'ERR_ABORTED', url, true);
    throw Object.assign(new Error('ERR_ABORTED'), { errno: -3 });
  };
  await navigation.load(SITE_URL);
  assert.equal(failures.length, 0);
});

test('loading the local error page cannot recursively become another error', () => {
  const { page, failures } = setup();
  page.emit('did-navigate', {}, 'file:///app/error.html', -1, '');
  page.emit('did-fail-load', {}, -6, 'ERR_FILE_NOT_FOUND', 'file:///app/error.html', true);
  assert.equal(failures.length, 0);
});

test('successful pages and non-200 success codes remain usable', async () => {
  const { page, failures, navigation } = setup();
  for (const status of [200, 201, 204, 304]) {
    page.request = async url => {
      page.emit('did-navigate', {}, url, status, '');
    };
    assert.equal(await navigation.load(SITE_URL), true);
  }
  assert.equal(failures.length, 0);
});

test('retry can succeed, then a subsequent request can fail normally', async () => {
  const { page, failures, navigation } = setup();
  page.request = async () => {
    throw new Error('offline');
  };
  await navigation.load(SITE_URL);
  page.request = async () => {};
  assert.equal(await navigation.load(`${SITE_URL}/catalogue/`), true);
  page.request = async () => {
    throw new Error('offline again');
  };
  await navigation.load(`${SITE_URL}/planning/`);
  assert.equal(failures.length, 2);
  assert.equal(failures[1].url, `${SITE_URL}/planning/`);
});

test('an obsolete request cannot replace a newer successful navigation', async () => {
  const { page, failures, navigation } = setup();
  let rejectFirst;
  page.request = () =>
    new Promise((_resolve, reject) => {
      rejectFirst = reject;
    });
  const old = navigation.load(SITE_URL);
  page.request = async () => {};
  await navigation.load(`${SITE_URL}/catalogue/`);
  rejectFirst(new Error('old failed request'));
  await old;
  assert.equal(failures.length, 0);
});

test('unsafe programmatic loads are refused, while old site URLs are migrated', async () => {
  const { page, navigation } = setup();
  await assert.rejects(navigation.load('file:///tmp/anything.html'));
  let loaded;
  page.request = async url => {
    loaded = url;
  };
  await navigation.load('https://anime-sama.fr/profil/');
  assert.equal(loaded, `${SITE_URL}/profil/`);
});

test('reload from recovery retries the failed content page rather than the home page', async () => {
  const { page, navigation } = setup();
  const url = `${SITE_URL}/catalogue/test/saison2/vostfr/?ep=7`;
  page.request = async () => {
    throw new Error('offline');
  };
  await navigation.load(url);
  let retried;
  page.request = async value => {
    retried = value;
  };
  assert.equal(await navigation.retry(), true);
  assert.equal(retried, url);
});
