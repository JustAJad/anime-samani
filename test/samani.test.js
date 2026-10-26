const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { readFileSync } = require('node:fs');
const { sanitize, defaults, websiteCss } = require('../lib/preferences');
const { Decoder, encode, Presence, buildActivity } = require('../lib/presence');

test('French and English cover every desktop label and the same complete vocabulary', () => {
  const fr = require('../desktop/i18n/fr.json'),
    en = require('../desktop/i18n/en.json');
  assert.deepEqual(Object.keys(fr).sort(), Object.keys(en).sort());
  assert.deepEqual(Object.keys(en).sort(), Object.keys(require('../desktop/i18n/ja.json')).sort());
  const html = readFileSync('desktop/index.html', 'utf8');
  for (const match of html.matchAll(/data-(?:i18n|title|placeholder)="([^"]+)"/g))
    assert.ok(fr[match[1]] && en[match[1]], match[1]);
  assert.equal(defaults.language, 'fr');
});
test('theme inputs cannot inject CSS or grant local files', () => {
  const p = sanitize({
    colorA: 'red;url(file:///etc/passwd)',
    media: '../../secret',
    blur: 999,
    brightness: -5,
    language: 'xx',
    surface: NaN,
  });
  assert.equal(p.colorA, defaults.colorA);
  assert.equal(p.media, null);
  assert.equal(p.blur, 40);
  assert.equal(p.brightness, 10);
  assert.equal(p.surface, defaults.surface);
  assert.doesNotMatch(websiteCss(p), /passwd/);
});
test('preference updates preserve untouched settings and validate Discord application IDs', () => {
  const prior = sanitize({ language: 'en', rpcClientId: '1563568424691437578', blur: 24 });
  const after = sanitize({ alwaysOnTop: true, rpcClientId: 'token-or-script' }, prior);
  assert.equal(after.language, 'en');
  assert.equal(after.blur, 24);
  assert.equal(after.alwaysOnTop, true);
  assert.equal(after.rpcClientId, undefined);
  assert.equal(after.rpcTemplate, undefined);
});
test('Discord decoder handles partial Unicode frames and multiple messages in one packet', () => {
  const a = encode(1, { evt: 'READY', title: 'Épisode — 呪術' }),
    b = encode(3, { nonce: 'ping' }),
    decoder = new Decoder();
  assert.deepEqual(decoder.push(a.subarray(0, 5)), []);
  assert.deepEqual(decoder.push(Buffer.concat([a.subarray(5), b])), [
    { opcode: 1, data: { evt: 'READY', title: 'Épisode — 呪術' } },
    { opcode: 3, data: { nonce: 'ping' } },
  ]);
});
test('Discord decoder rejects excessive frame sizes', () => {
  const header = Buffer.alloc(8);
  header.writeUInt32LE(1024 * 1024 + 1, 4);
  assert.throws(() => new Decoder().push(header), /Oversized/);
});
test('Discord privacy toggles remove title and episode from the payload', () => {
  const activity = buildActivity(
    {
      title: 'Private title',
      episode: 'Episode 7',
      season: 'S2',
      playing: true,
      url: 'https://anime-sama.to/catalogue/private-title/',
    },
    { ...defaults, rpcShowTitle: false, rpcShowEpisode: false },
    100,
    'https://github.com/JustAJad/anime-samani'
  );
  assert.doesNotMatch(JSON.stringify(activity), /Private title|Episode 7|S2/);
  assert.match(activity.details, /Anime Samani$/);
  assert.equal(activity.timestamps, undefined);
  assert.equal(new URL(activity.buttons[0].url).searchParams.get('url'), 'https://anime-sama.to/');
});
test('Fixed Discord text, episode data and pause state produce bounded bilingual payloads', () => {
  const activity = buildActivity(
    {
      title: 'A'.repeat(300),
      episode: 'Episode 7',
      season: 'S2',
      language: 'VF',
      playing: true,
      url: 'https://anime-sama.to/catalogue/test/',
    },
    { ...defaults, language: 'en', rpcButtons: false },
    null,
    'https://github.com/JustAJad/anime-samani'
  );
  assert.equal(activity.details.length, 128);
  assert.match(activity.state, /EP7/);
  assert.equal(activity.timestamps, undefined);
  assert.equal(activity.buttons, undefined);
});
test('Discord handshake waits for READY, answers ping, and clears presence on disable', () => {
  class Socket extends EventEmitter {
    constructor() {
      super();
      this.destroyed = false;
      this.writes = [];
    }
    setTimeout() {}
    write(packet) {
      this.writes.push(new Decoder().push(packet)[0]);
    }
    destroy() {
      this.destroyed = true;
    }
  }
  const socket = new Socket();
  const presence = new Presence({ connect: () => socket, platform: 'win32' });
  presence.configure(true, '1563568424691437578');
  presence.update({ details: 'Anime Samani' });
  socket.emit('connect');
  assert.equal(socket.writes[0].opcode, 0);
  assert.equal(socket.writes.length, 1);
  socket.emit('data', encode(1, { evt: 'READY' }));
  assert.equal(presence.status, 'connected');
  assert.equal(socket.writes[1].data.cmd, 'SET_ACTIVITY');
  socket.emit('data', encode(3, { nonce: 'pong' }));
  assert.equal(socket.writes[2].opcode, 4);
  presence.stop();
  assert.equal(socket.writes.at(-1).data.args.activity, null);
  assert.equal(socket.destroyed, true);
  assert.equal(presence.status, 'disabled');
});
test('disabled or unconfigured Discord never attempts to open a socket', () => {
  let attempts = 0;
  const presence = new Presence({
    connect: () => {
      attempts++;
      throw new Error('unexpected');
    },
  });
  presence.configure(false, '');
  presence.configure(true, '');
  assert.equal(presence.status, 'unconfigured');
  assert.equal(attempts, 0);
  presence.stop();
});

test('browsing session clock is preserved and playback countdown uses actual position', () => {
  const repo = 'https://github.com/JustAJad/anime-samani';
  for (const url of ['https://anime-sama.to/', 'https://anime-sama.to/planning/'])
    assert.equal(
      buildActivity({ url, playing: false }, defaults, 1234, repo).timestamps.start,
      1234
    );
  const a = buildActivity(
    {
      url: 'https://anime-sama.to/catalogue/test/',
      playing: true,
      time: 120,
      duration: 1440,
      rate: 1,
      image: 'https://example.com/cover.jpg',
      season: 'S2',
      episode: 'Episode 4',
    },
    defaults,
    1234,
    repo
  );
  assert.ok(Math.abs(a.timestamps.end - Date.now() - 1320000) < 100);
  assert.equal(a.assets.large_image, 'https://example.com/cover.jpg');
  assert.match(a.state, /S2.*EP4/);
});

test('player snapshots and saved positions reject invalid or out-of-range times', () => {
  const { validPosition, progressKey } = require('../lib/playback');
  assert.ok(validPosition({ time: 120, duration: 1440 }));
  assert.equal(validPosition({ time: NaN, duration: 1440 }), false);
  assert.equal(validPosition({ time: 1500, duration: 1440 }), false);
  assert.notEqual(
    progressKey({ url: 'https://anime-sama.to/a', episode: 'EP1' }),
    progressKey({ url: 'https://anime-sama.to/a', episode: 'EP2' })
  );
});

test('paused episodes keep artwork without a countdown and episode privacy hides subtext', () => {
  const a = buildActivity(
    {
      url: 'https://anime-sama.to/catalogue/test/',
      playing: false,
      time: 120,
      duration: 1440,
      rate: 1,
      title: 'Show',
      episodeTitle: 'Secret',
      image: 'https://example.com/cover.jpg',
    },
    { ...defaults, rpcShowEpisode: false },
    1234,
    'https://github.com/JustAJad/anime-samani'
  );
  assert.equal(a.timestamps, undefined);
  assert.equal(a.assets.large_image, 'https://example.com/cover.jpg');
  assert.ok(!a.state.includes('Secret'));
});

test('updater checks, downloads and only installs a completed update', async () => {
  const { readFileSync } = require('node:fs'),
    vm = require('node:vm'),
    { EventEmitter } = require('node:events');
  const updater = new EventEmitter();
  let checks = 0,
    downloads = 0,
    installs = 0,
    notifies = 0,
    quits = 0;
  updater.checkForUpdates = async () => {
    checks++;
  };
  updater.downloadUpdate = async () => {
    downloads++;
  };
  updater.quitAndInstall = () => installs++;
  const sandbox = {
    module: { exports: {} },
    process: { platform: 'win32', env: {} },
    setTimeout: () => ({ unref() {} }),
    require: name =>
      name === 'electron-updater'
        ? { autoUpdater: updater }
        : { dialog: { showMessageBox: async () => ({ response: 1 }) } },
  };
  vm.runInNewContext(readFileSync(require.resolve('../lib/updates'), 'utf8'), sandbox);
  const updates = sandbox.module.exports.installUpdates({ isPackaged: true }, null, {
    notify: () => notifies++,
    beforeInstall: () => quits++,
    minimumReleaseDate: '2026-10-25T12:44:00Z',
  });
  await updates.action('install');
  assert.equal(installs, 0);
  await updates.action('check');
  assert.equal(checks, 1);
  updater.emit('update-available', { version: '1.0.2', releaseDate: '2026-10-24T20:00:00Z' });
  assert.equal(updates.state().status, 'current');
  await updates.action('download');
  assert.equal(downloads, 0);
  updater.emit('update-available', { version: '1.0.1', releaseDate: '2026-10-26T00:00:00Z' });
  assert.equal(updates.state().version, '1.0.1');
  await updates.action('download');
  assert.equal(downloads, 1);
  updater.emit('download-progress', { percent: 42.4 });
  assert.equal(updates.state().percent, 42);
  updater.emit('update-downloaded');
  await updates.action('install');
  assert.equal(installs, 1);
  assert.equal(quits, 1);
  assert.ok(notifies >= 3);
  updater.emit('error', new Error('offline'));
  assert.equal(updates.state().status, 'error');
});

test('anime favorites use one show identity and reject generic and scan URLs', () => {
  const { animeIdentity, favoriteEntry, normalizeFavorites } = require('../lib/library');
  for (const url of [
    'https://anime-sama.to/',
    'https://anime-sama.to/catalogue/',
    'https://anime-sama.to/catalogue/test/scan/vf/',
    'https://other.test/catalogue/test/',
  ])
    assert.equal(animeIdentity(url), null);
  assert.equal(favoriteEntry({ url: 'https://anime-sama.to/catalogue/test/', anime: false }), null);
  const a = favoriteEntry({
      url: 'https://anime-sama.to/catalogue/test/saison1/vf/',
      anime: true,
      title: 'Test',
    }),
    b = favoriteEntry({
      url: 'https://anime-sama.to/catalogue/test/saison2/vostfr/',
      anime: true,
      title: 'Test',
    });
  assert.equal(a.id, b.id);
  assert.equal(a.url, 'https://anime-sama.to/catalogue/test/');
  assert.equal(normalizeFavorites([a, b]).length, 1);
  assert.equal(normalizeFavorites([{ url: 'https://anime-sama.to/' }]).length, 0);
});

test('Discord watching and pause use localized status, artwork and per-anime app links', () => {
  const page = {
    url: 'https://anime-sama.to/catalogue/chobits/saison1/vostfr/',
    title: 'Chobits',
    episode: 'Épisode 2',
    season: 'S1',
    hasPlayback: true,
    playing: false,
  };
  for (const [language, label] of [
    ['fr', 'En pause'],
    ['en', 'Paused'],
    ['ja', '一時停止中'],
  ]) {
    const activity = buildActivity(
      page,
      { ...defaults, language },
      123,
      'https://github.com/JustAJad/anime-samani'
    );
    assert.ok(activity.state.startsWith(label));
    assert.match(activity.assets.small_image, /rpc-pause.png$/);
    assert.equal(activity.timestamps, undefined);
    assert.equal(new URL(activity.buttons[0].url).searchParams.get('url'), page.url);
    assert.equal(
      new URL(activity.buttons[1].url).searchParams.get('url'),
      'https://anime-sama.to/catalogue/chobits/'
    );
    const playing = buildActivity(
      { ...page, playing: true, time: 45, duration: 1400, rate: 1 },
      { ...defaults, language },
      123,
      'https://github.com/JustAJad/anime-samani'
    );
    assert.match(playing.assets.small_image, /rpc-play.png$/);
    assert.ok(playing.timestamps.end > Date.now());
  }
});
