const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, readdirSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createMediaStore, MEDIA_ID } = require('../lib/media');
const { createProgress } = require('../lib/progress');
const { displayVersion } = require('../lib/version');
const { cleanText } = require('../lib/text');

test('media store copies valid backgrounds and keeps only the active one', t => {
  const root = mkdtempSync(join(tmpdir(), 'samani-media-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'Picture.PNG');
  writeFileSync(source, 'png');
  const store = createMediaStore(join(root, 'store'));
  const first = store.import(source, 'image');
  const second = store.import(source, 'image');
  assert.match(first, MEDIA_ID);
  assert.ok(store.exists(first) && store.exists(second));
  assert.throws(() => store.import(source, 'video'), /invalidMedia/);
  assert.throws(() => store.import(source, 'other'), /invalidMedia/);
  writeFileSync(join(root, 'store', 'notes.txt'), 'not ours');
  store.keepOnly(second);
  assert.deepEqual(readdirSync(join(root, 'store')).sort(), ['notes.txt', second].sort());
  store.remove('../Picture.PNG');
  assert.ok(readdirSync(root).includes('Picture.PNG'), 'paths outside the store are never removed');
  assert.equal(store.exists('../Picture.PNG'), false);
});

test('media protocol only serves stored backgrounds', async t => {
  const root = mkdtempSync(join(tmpdir(), 'samani-media-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'clip.webm'), 'webm');
  const store = createMediaStore(join(root, 'store'));
  const id = store.import(join(root, 'clip.webm'), 'video');
  const get = url => store.serve(new Request(url));
  assert.equal(get(`samani-media://background/${id}`).status, 200);
  assert.equal(await get(`samani-media://background/${id}`).text(), 'webm');
  assert.equal(get(`samani-media://other/${id}`).status, 404);
  assert.equal(get('samani-media://background/clip.webm').status, 404);
});

test('playback progress keeps the most recent episodes only', () => {
  const data = {};
  const fake = {
    get store() {
      return { ...data };
    },
    set store(value) {
      for (const key of Object.keys(data)) delete data[key];
      Object.assign(data, value);
    },
    get: key => data[key],
    set: (key, value) => (data[key] = value),
    has: key => Object.hasOwn(data, key),
  };
  data.old = { time: 1, duration: 2, updatedAt: 1 };
  data.older = { time: 1, duration: 2, updatedAt: 0 };
  data.recent = { time: 1, duration: 2, updatedAt: 5 };
  const progress = createProgress(fake, 2);
  assert.deepEqual(Object.keys(data).sort(), ['old', 'recent']);
  progress.save('new', 30, 1400);
  assert.deepEqual(Object.keys(data).sort(), ['new', 'recent']);
  assert.equal(progress.get('new').time, 30);
  progress.save('new', 40, 1400);
  assert.equal(Object.keys(data).length, 2);
});

test('version labels and page text helpers', () => {
  assert.equal(displayVersion('1.0.0'), '1.0');
  assert.equal(displayVersion('1.2.0'), '1.2');
  assert.equal(displayVersion('1.2.3'), '1.2.3');
  assert.equal(displayVersion('10.0.0-beta'), '10.0.0-beta');
  assert.equal(cleanText('a\u0000b\nc\u007fd', 10), 'abcd');
  assert.equal(cleanText(null, 5), '');
  assert.equal(cleanText('abcdef', 3), 'abc');
});
