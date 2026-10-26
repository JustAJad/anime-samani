const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { isAdUrl, installAdFilter } = require('../lib/ads');

test('ad filter matches hosts precisely and only affects the website view', () => {
  assert.ok(isAdUrl('https://ads.doubleclick.net/banner'));
  assert.equal(isAdUrl('https://doubleclick.net.evil.test/'), false);
  assert.equal(isAdUrl('https://player.test/video.mp4'), false);
  let listener;
  const requests = { onBeforeRequest: (...args) => (listener = args.at(-1)) };
  const ctx = {
    wc: { id: 7, session: { webRequest: requests } },
    preferences: { blockAds: true },
    disposers: [],
  };
  installAdFilter(ctx);
  const blocked = (id, url) => {
    let result;
    listener({ webContentsId: id, url }, value => (result = value.cancel));
    return result;
  };
  assert.equal(blocked(7, 'https://ads.doubleclick.net/banner'), true);
  assert.equal(blocked(8, 'https://ads.doubleclick.net/banner'), false);
  assert.equal(blocked(7, 'https://player.test/video.mp4'), false);
  ctx.preferences.blockAds = false;
  assert.equal(blocked(7, 'https://ads.doubleclick.net/banner'), false);
  ctx.disposers[0]();
  assert.equal(listener, null);
});

test('automatic discovery shares in-flight scans, caches success, preserves the domain and survives failure', async () => {
  let scans = 0,
    fail = false,
    release;
  const timers = [],
    data = {};
  const scan = {
    ts: Date.now(),
    official: 'anime-sama.si',
    results: [{ domain: 'anime-sama.si', status: 'online' }],
  };
  const sandbox = {
    module: { exports: {} },
    Date,
    Promise,
    setInterval: fn => {
      timers.push(fn);
      return { unref() {} };
    },
    clearInterval() {},
    require: name => {
      if (name === 'electron') return { net: { fetch() {} } };
      if (name === '../navigation') return { addKnownDomains() {} };
      return {
        SCAN_COOLDOWN_MS: 300000,
        scanDomains: async () => {
          scans++;
          if (fail) throw Error('offline');
          await new Promise(resolve => (release = resolve));
          return scan;
        },
      };
    },
  };
  vm.runInNewContext(readFileSync(require.resolve('../lib/main/discovery'), 'utf8'), sandbox);
  const ctx = {
    preferences: { autoDomain: true, domain: 'anime-sama.to' },
    config: { get: key => data[key], set: (key, value) => (data[key] = value) },
    send() {},
    t: key => key,
    disposers: [],
  };
  sandbox.module.exports.installDiscovery(ctx);
  const first = ctx.scanDomains();
  assert.equal(first, ctx.scanDomains());
  release();
  await first;
  await ctx.scanDomains();
  assert.equal(scans, 1);
  assert.equal(ctx.preferences.domain, 'anime-sama.to');
  data.domainScan.ts = 1;
  fail = true;
  await assert.rejects(ctx.scanDomains(), /domainScanError/);
  assert.equal(ctx.domainScanning, false);
  assert.equal(ctx.domainScanError, true);
  assert.equal(data.domainScan.official, 'anime-sama.si');
  ctx.preferences.autoDomain = false;
  timers[0]();
  assert.equal(scans, 2);
  ctx.disposers[0]();
});
