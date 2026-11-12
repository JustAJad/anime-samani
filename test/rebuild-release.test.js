const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const versionHelpers = require('../lib/version');

const code = readFileSync(require.resolve('../scripts/release.cjs'), 'utf8');

function run(rebuildVersion, options = {}) {
  const version = options.version || '1.1.0';
  const publicVersion = versionHelpers.displayVersion(version);
  const tag = versionHelpers.releaseTag(version);
  const releases = options.releases || [
    {
      tag_name: tag,
      id: 11,
      assets: [{ name: 'package-info.json', url: 'package-info-url' }],
    },
  ];
  const currentVersion = options.currentVersion || version;
  const publishedAssets =
    options.publishedAssets || releases.find(release => release.tag_name === tag)?.assets || [];
  const writes = [];
  const exit = {};

  try {
    vm.runInNewContext(code, {
      require: name => {
        if (name === 'node:child_process') {
          return {
            execFileSync: (_command, args) => {
              if (args[0] === 'api' && args[1]?.includes('/releases?')) {
                return JSON.stringify(releases);
              }
              if (args.includes('Accept: application/octet-stream')) {
                return JSON.stringify({ version: currentVersion });
              }
              if (args[0] === 'api' && args[1]?.includes('/assets?')) {
                return JSON.stringify(publishedAssets);
              }
              writes.push(args);
              return '';
            },
          };
        }
        if (name === 'node:fs') {
          return {
            readdirSync: () => [
              'Anime-Samani-Setup-x64.exe',
              `Anime-Samani-${publicVersion}-Source.zip`,
              'latest.yml',
              'package-info.json',
              'SHA256SUMS.txt',
            ],
          };
        }
        if (name === 'node:path') return path;
        if (name.includes('package-info')) return { version };
        if (name === '../lib/version') return versionHelpers;
        throw new Error(`Unexpected module in release test: ${name}`);
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

test('the same internal build leaves the rolling public release untouched', () => {
  assert.equal(run(undefined, { version: '1.2.1' }).length, 0);
  assert.throws(() => run('1.2.0', { version: '1.2.1' }), /explicitly requested/);
});

test('the explicitly requested legacy 1.1 rebuild remains supported', () => {
  const calls = run('1.1.0');
  assert.equal(calls.length, 3);
  assert.ok(!calls[0].includes(path.join('release-assets', 'latest.yml')));
  assert.ok(calls[1].includes(path.join('release-assets', 'latest.yml')));
  assert.equal(calls[2][1], 'edit');
  assert.ok(!calls.some(args => args.includes('create') || args.includes('--force')));
});

test('a newer internal patch safely refreshes the existing public minor release', () => {
  const calls = run(undefined, {
    version: '1.2.1',
    currentVersion: '1.2.0',
    releases: [
      {
        tag_name: 'v1.2.0',
        id: 12,
        assets: [{ name: 'package-info.json', url: 'package-info-url' }],
      },
    ],
    publishedAssets: [
      { name: 'Anime-Samani-1.2-Source.zip', id: 1 },
      { name: 'Anime-Samani-1.2.0-Source.zip', id: 99 },
    ],
  });

  const uploads = calls.filter(args => args[0] === 'release' && args[1] === 'upload');
  assert.equal(uploads.length, 2);
  assert.equal(uploads[0][2], 'v1.2.0');
  assert.ok(!uploads[0].includes(path.join('release-assets', 'latest.yml')));
  assert.ok(uploads[1].includes(path.join('release-assets', 'latest.yml')));

  const tagUpdate = calls.find(
    args => args[0] === 'api' && args.includes('repos/JustAJad/anime-samani/git/refs/tags/v1.2.0')
  );
  assert.ok(tagUpdate);
  assert.ok(tagUpdate.includes('sha=new-source'));

  const edit = calls.find(args => args[0] === 'release' && args[1] === 'edit');
  assert.ok(edit.includes('Anime Samani 1.2'));
  assert.ok(edit.includes('--latest'));

  const deletion = calls.find(args => args.includes('repos/JustAJad/anime-samani/releases/assets/99'));
  assert.ok(deletion);
  assert.ok(!calls.some(args => args.includes('create')));
});

test('a new minor line creates a new public release', () => {
  const calls = run(undefined, {
    version: '1.3.0',
    releases: [
      { tag_name: 'v1.2.0', id: 12 },
      { tag_name: 'v1.1.0', id: 11 },
    ],
  });
  assert.ok(calls.some(args => args.includes('create') && args.includes('v1.3.0')));
  assert.ok(calls.some(args => args.includes('edit') && args.includes('--latest')));
  assert.ok(!calls.some(args => args[0] === 'api' && args.includes('PATCH')));
});
