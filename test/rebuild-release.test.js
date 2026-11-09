const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const code = readFileSync(require.resolve('../scripts/release.cjs'), 'utf8');
function run(rebuildVersion, options = {}) {
  const version = options.version || '1.1.0';
  const releases = options.releases || [{ tag_name: 'v1.1.0' }];
  const writes = [],
    exit = {};
  try {
    vm.runInNewContext(code, {
      require: name => {
        if (name === 'node:child_process')
          return {
            execFileSync: (_command, args) => {
              if (args[0] === 'api' && !args.includes('--method')) return JSON.stringify(releases);
              writes.push(args);
              return '';
            },
          };
        if (name === 'node:fs')
          return {
            readdirSync: () => [
              'Anime-Samani-Setup-x64.exe',
              `Anime-Samani-${version}-Source.zip`,
              'latest.yml',
              'SHA256SUMS.txt',
            ],
          };
        if (name === 'node:path') return require(name);
        if (name.includes('package-info')) return { version };
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

test('a new V2 release becomes latest and archives earlier releases', () => {
  const calls = run(undefined, {
    version: '2.0.0',
    releases: [
      { tag_name: 'v1.1.0', id: 11, body: '1.1 notes' },
      { tag_name: 'v1.0.0', id: 10, body: '1.0 notes' },
    ],
  });
  assert.ok(calls.some(args => args.includes('create') && args.includes('v2.0.0')));
  assert.ok(calls.some(args => args.includes('edit') && args.includes('--latest')));
  const archived = calls.filter(args => args[0] === 'api' && args.includes('PATCH'));
  assert.equal(archived.length, 2);
  assert.ok(archived.every(args => args.includes('make_latest=false')));
});
