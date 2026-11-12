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
    require: name => {
      if (name === 'electron-builder') return builder;
      if (name === './lib/version') return require('../lib/version');
      return require('../package.json');
    },
    process: { argv: ['--installer'] },
    console,
  });
  assert.equal(config.nsis.artifactName, 'Anime-Samani-Setup-${arch}.${ext}');
  assert.equal(config.nsis.include, 'build/installer.nsh');
  assert.equal(config.portable.artifactName, 'Anime-Samani-1.2-Portable-${arch}.${ext}');
  assert.equal(config.win.artifactName, 'Anime-Samani-1.2-Windows-${arch}.${ext}');
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
    require: name => {
      if (name === 'electron-builder') return builder;
      if (name === './lib/version') return require('../lib/version');
      return pkg;
    },
    process: { argv: ['--installer'] },
    console,
  });
  assert.equal(pkg.version, '1.2.2');
  assert.equal(pkg.author.name, 'Just A Jad');
  assert.equal(config.nsis.uninstallDisplayName, 'Anime Samani');
  assert.equal(config.compression, 'maximum');
  assert.equal(config.electronLanguages, undefined, 'all Chromium locales are retained');
});

test('the assisted installer uses concise update wording and keeps its path on a new line', () => {
  const { readFileSync } = require('node:fs');
  const include = readFileSync('build/installer.nsh', 'utf8');
  assert.match(include, /L’assistant va mettre à jour l'application\./);
  assert.match(include, /perUserInstallExists 1036 .*\$\\r\$\\n/);
  assert.match(include, /The wizard will update the application\./);
  assert.match(include, /ウィザードがアプリケーションを更新します。/);
});
