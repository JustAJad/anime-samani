// SPDX-License-Identifier: MPL-2.0
// Run by GitHub Actions after Windows tests and packaging pass.
const { execFileSync } = require('node:child_process');
const { readdirSync } = require('node:fs');
const { basename, join } = require('node:path');
const pkg = require('../release-assets/package-info.json');
const { displayVersion, releaseTag } = require('../lib/version');

const repository = process.env.GITHUB_REPOSITORY;
const commit = process.env.GITHUB_SHA;
if (!repository || !commit) throw new Error('Run releases through the Windows build workflow.');

const tag = releaseTag(pkg.version);
const gh = (args, options = {}) =>
  execFileSync('gh', args, { encoding: 'utf8', ...options });
const releases = JSON.parse(gh(['api', `repos/${repository}/releases?per_page=100`]));
const existing = releases.find(release => release.tag_name === tag);
const legacyRebuild =
  process.env.SAMANI_REBUILD_VERSION === '1.1.0' && pkg.version === '1.1.0';
if (process.env.SAMANI_REBUILD_VERSION && !legacyRebuild)
  throw new Error('Only the explicitly requested 1.1.0 rebuild is supported.');

const files = readdirSync('release-assets')
  .sort()
  .map(file => join('release-assets', file));
const manifest = files.find(file => file === join('release-assets', 'latest.yml'));
if (
  !manifest ||
  !files.some(file => file.endsWith('Setup-x64.exe')) ||
  !files.some(file => file.endsWith('Source.zip'))
) {
  throw new Error('Release assets must include updater metadata, Setup and corresponding source.');
}

function versionParts(value) {
  if (!/^\d+\.\d+\.\d+$/.test(value)) throw new Error(`Invalid release version: ${value}`);
  return value.split('.').map(Number);
}
function compareVersions(left, right) {
  const a = versionParts(left),
    b = versionParts(right);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}
function publishedInfo(release) {
  const asset = release.assets?.find(item => item.name === 'package-info.json');
  if (!asset) throw new Error(`${tag} is missing package-info.json`);
  return JSON.parse(
    gh(['api', '-H', 'Accept: application/octet-stream', asset.url])
  );
}

if (existing && !legacyRebuild) {
  const published = publishedInfo(existing);
  if (published.version === pkg.version) {
    console.log(`${tag} already carries internal build ${pkg.version}; downloads are unchanged.`);
    process.exit(0);
  }
  if (displayVersion(published.version) !== displayVersion(pkg.version))
    throw new Error(`Refusing to mix ${published.version} and ${pkg.version} in ${tag}.`);
  if (compareVersions(pkg.version, published.version) <= 0)
    throw new Error(`Rolling update ${pkg.version} must be newer than ${published.version}.`);
}

if (existing) {
  if (repository !== 'JustAJad/anime-samani') throw new Error('Unexpected rolling-release repository');

  // Upload payloads first. latest.yml is uploaded last so installed apps cannot
  // discover the new internal build before its matching installer is available.
  gh(
    [
      'release',
      'upload',
      tag,
      ...files.filter(file => file !== manifest),
      '--repo',
      repository,
      '--clobber',
    ],
    { stdio: 'inherit' }
  );

  if (!legacyRebuild) {
    gh(
      [
        'api',
        '--method',
        'PATCH',
        `repos/${repository}/git/refs/tags/${tag}`,
        '-f',
        `sha=${commit}`,
        '-F',
        'force=true',
      ],
      { stdio: 'inherit' }
    );
  }

  gh(['release', 'upload', tag, manifest, '--repo', repository, '--clobber'], {
    stdio: 'inherit',
  });
  gh(
    [
      'release',
      'edit',
      tag,
      '--repo',
      repository,
      '--title',
      `Anime Samani ${displayVersion(pkg.version)}`,
      '--notes-file',
      'RELEASE-NOTES.md',
      '--latest',
    ],
    { stdio: 'inherit' }
  );

  if (!legacyRebuild) {
    const wanted = new Set(files.map(file => basename(file)));
    const assets = JSON.parse(gh(['api', `repos/${repository}/releases/${existing.id}/assets?per_page=100`]));
    for (const asset of assets) {
      if (wanted.has(asset.name)) continue;
      gh(
        ['api', '--method', 'DELETE', `repos/${repository}/releases/assets/${asset.id}`],
        { stdio: 'inherit' }
      );
    }
  }

  console.log(
    legacyRebuild
      ? `Rebuilt ${tag} from ${commit}.`
      : `Updated public ${displayVersion(pkg.version)} to internal build ${pkg.version} from ${commit}.`
  );
  process.exit(0);
}

gh(
  [
    'release',
    'create',
    tag,
    ...files,
    '--repo',
    repository,
    '--target',
    commit,
    '--title',
    `Anime Samani ${displayVersion(pkg.version)}`,
    '--notes-file',
    'RELEASE-NOTES.md',
  ],
  { stdio: 'inherit' }
);
gh(['release', 'edit', tag, '--repo', repository, '--latest'], { stdio: 'inherit' });
