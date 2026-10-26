const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { metadata } = require('../scripts/rename-setup.cjs');
test('stable installer paths retain updater version and payload hash, updating the metadata checksum', () => {
  const old = 'Anime-Samani-1.1.0-Setup-x64.exe';
  const latest = `version: 1.1.0\nfiles:\n  - url: ${old}\n    sha512: unchanged\npath: ${old}\n`;
  const sums = `${'a'.repeat(64)}  ${old}\n${'b'.repeat(64)}  ${old}.blockmap\n${'c'.repeat(64)}  latest.yml\n`;
  const next = metadata(latest, sums);
  assert.ok(!next.latest.includes(old));
  assert.match(next.latest, /version: 1\.1\.0/);
  assert.match(next.latest, /sha512: unchanged/);
  assert.ok(next.sums.includes(`${'a'.repeat(64)}  Anime-Samani-Setup-x64.exe`));
  assert.ok(next.sums.includes(`${'b'.repeat(64)}  Anime-Samani-Setup-x64.exe.blockmap`));
  assert.ok(
    next.sums.includes(createHash('sha256').update(next.latest).digest('hex') + '  latest.yml')
  );
  assert.deepEqual(metadata(next.latest, next.sums), next);
  assert.throws(() => metadata('unknown', sums), /Unexpected/);
  assert.throws(() => metadata(latest, ''), /missing/);
});

test('packaging keeps Setup stable while Portable and ZIP remain versioned', () => {
  const vm = require('node:vm');
  const { readFileSync } = require('node:fs');
  let config;
  const builder = {
    Platform: { WINDOWS: { createTarget: () => [] } },
    Arch: { x64: 'x64' },
    build: options => {
      config = options.config;
      return Promise.resolve();
    },
  };
  vm.runInNewContext(readFileSync(require.resolve('../build'), 'utf8'), {
    require: name => (name === 'electron-builder' ? builder : require('../package.json')),
    process: { argv: ['--installer'] },
    console,
  });
  assert.equal(config.nsis.artifactName, 'Anime-Samani-Setup-${arch}.${ext}');
  assert.ok(config.portable.artifactName.includes('${version}'));
  assert.ok(config.win.artifactName.includes('${version}'));
});

test('Windows registration uses the plain app name and Just A Jad with lossless packaging', () => {
  const vm = require('node:vm');
  const { readFileSync } = require('node:fs');
  let config;
  const pkg = require('../package.json');
  const builder = {
    Platform: { WINDOWS: { createTarget: () => [] } },
    Arch: { x64: 'x64' },
    build: options => {
      config = options.config;
      return Promise.resolve();
    },
  };
  vm.runInNewContext(readFileSync(require.resolve('../build'), 'utf8'), {
    require: name => (name === 'electron-builder' ? builder : pkg),
    process: { argv: ['--installer'] },
    console,
  });
  assert.equal(pkg.version, '1.1.0');
  assert.equal(pkg.author.name, 'Just A Jad');
  assert.equal(config.nsis.uninstallDisplayName, 'Anime Samani');
  assert.equal(config.compression, 'maximum');
  assert.equal(config.electronLanguages, undefined, 'all Chromium locales are retained');
});
