const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const code = readFileSync(require.resolve('../scripts/release.cjs'), 'utf8');
function run(rebuildVersion) {
  const writes = [],
    exit = {};
  try {
    vm.runInNewContext(code, {
      require: name => {
        if (name === 'node:child_process')
          return {
            execFileSync: (_command, args) => {
              if (args[0] === 'api') return JSON.stringify([{ tag_name: 'v1.1.0' }]);
              writes.push(args);
              return '';
            },
          };
        if (name === 'node:fs')
          return {
            readdirSync: () => [
              'Anime-Samani-Setup-x64.exe',
              'Anime-Samani-1.1.0-Source.zip',
              'latest.yml',
              'SHA256SUMS.txt',
            ],
          };
        if (name === 'node:path') return require(name);
        if (name.includes('package-info')) return { version: '1.1.0' };
        return { displayVersion: value => value };
      },
      process: {
        env: {
          GITHUB_REPOSITORY: 'JustAJad/anime-samani',
          GITHUB_SHA: 'new-source',
          SAMANI_REBUILD_VERSION: rebuildVersion,
        },
        exit: () => {
          throw exit;
        },
      },
      console: { log() {} },
    });
  } catch (error) {
    if (error !== exit) throw error;
  }
  return writes;
}
test('an existing release stays untouched unless the 1.1 rebuild is explicitly selected', () => {
  assert.equal(run(undefined).length, 0);
  assert.throws(() => run('1.2.0'), /explicitly requested/);
  const calls = run('1.1.0');
  assert.equal(calls.length, 3);
  assert.ok(!calls[0].includes(require('node:path').join('release-assets', 'latest.yml')));
  assert.ok(calls[1].includes(require('node:path').join('release-assets', 'latest.yml')));
  assert.equal(calls[2][1], 'edit');
  assert.ok(!calls.some(args => args.includes('create') || args.includes('--force')));
});
