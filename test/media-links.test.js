const { test } = require('node:test'),
  assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { serveMedia } = require('../lib/media'),
  { appLink, parseAppLink } = require('../lib/links');
const file = require('node:path').join(__dirname, 'fixtures/background.webm'),
  bytes = readFileSync(file);
test('local video supports full reads, HEAD, byte ranges, suffix ranges and unsatisfiable requests', async () => {
  const request = (method, range) =>
    new Request('https://example.test/video', { method, headers: range ? { Range: range } : {} });
  const all = serveMedia(file, request('GET'));
  assert.equal(all.status, 200);
  assert.deepEqual(Buffer.from(await all.arrayBuffer()), bytes);
  const head = serveMedia(file, request('HEAD'));
  assert.equal(head.headers.get('Content-Length'), String(bytes.length));
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  for (const [range, start, end] of [
    ['bytes=0-15', 0, 15],
    ['bytes=-16', bytes.length - 16, bytes.length - 1],
    [`bytes=${bytes.length - 16}-`, bytes.length - 16, bytes.length - 1],
  ]) {
    const r = serveMedia(file, request('GET', range));
    assert.equal(r.status, 206);
    assert.equal(r.headers.get('Content-Range'), `bytes ${start}-${end}/${bytes.length}`);
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), bytes.subarray(start, end + 1));
  }
  for (const range of ['bytes=999999999-', 'bytes=10-1', 'bytes=-0', 'bytes=1-3,5-8', 'bytes=-'])
    assert.equal(serveMedia(file, request('GET', range)).status, 416);
  assert.equal(serveMedia(file, request('POST')).status, 405);
});
test('app links preserve the episode and reject external, file and malformed destinations', () => {
  const target = 'https://anime-sama.to/catalogue/chobits/saison1/vostfr/';
  const link = appLink(target, 'fr', 'Épisode 2'),
    q = new URL(link).searchParams;
  assert.equal(q.get('url'), target);
  assert.deepEqual(parseAppLink('anime-samani://open?' + q), { url: target, episode: 'Épisode 2' });
  for (const uri of [
    'file:///etc/passwd',
    'anime-samani://open?url=https://evil.test/',
    'anime-samani://open?url=javascript:alert(1)',
    'anime-samani://other?url=' + encodeURIComponent(target),
  ])
    assert.equal(parseAppLink(uri), null);
  assert.throws(() => appLink('https://evil.test/'));
});
test('HTTPS handoff tries Samani, falls back to the website, and rejects unsafe targets', () => {
  const vm = require('node:vm'),
    code = readFileSync(require('node:path').join(__dirname, '../handoff/open/app.js'), 'utf8');
  function run(target) {
    const elements = {},
      events = {},
      timers = new Map();
    let timerId = 0,
      fallback;
    const location = {
      search: '?' + new URLSearchParams({ url: target, lang: 'fr' }),
      replace: value => (fallback = value),
    };
    const document = {
      documentElement: {},
      hidden: false,
      hasFocus: () => true,
      querySelector: id =>
        (elements[id] ||= {
          addEventListener(name, callback) {
            this[name] = callback;
          },
        }),
      addEventListener: (name, callback) => (events[name] = callback),
    };
    vm.runInNewContext(code, {
      URL,
      URLSearchParams,
      location,
      document,
      navigator: { language: 'fr' },
      addEventListener: (name, callback) => (events[name] = callback),
      setTimeout: callback => {
        timers.set(++timerId, callback);
        return timerId;
      },
      clearTimeout: id => timers.delete(id),
    });
    return { location, elements, events, document, timers, fallback: () => fallback };
  }
  const target = 'https://anime-sama.to/catalogue/chobits/';
  const active = run(target);
  assert.match(active.location.href, /^anime-samani:\/\/open/);
  [...active.timers.values()][0]();
  assert.equal(active.fallback(), target);
  const opened = run(target);
  opened.document.hidden = true;
  opened.events.visibilitychange();
  assert.equal(opened.timers.size, 0);
  assert.equal(opened.fallback(), undefined);
  for (const target of [
    'https://evil.test',
    'javascript:alert(1)',
    'https://user:password@anime-sama.to/',
    'https://anime-sama.to:8080/',
  ]) {
    const invalid = run(target);
    assert.equal(invalid.elements['#app'].hidden, true);
    assert.equal(invalid.timers.size, 0);
    assert.equal(invalid.location.href, undefined);
  }
});
