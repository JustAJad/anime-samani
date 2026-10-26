// SPDX-License-Identifier: MPL-2.0
// Run by GitHub Actions after Windows tests and packaging pass.
const { execFileSync } = require('node:child_process');
const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const pkg = require('../release-assets/package-info.json');
const repository = process.env.GITHUB_REPOSITORY;
const commit = process.env.GITHUB_SHA;
if (!repository || !commit) throw new Error('Run releases through the Windows build workflow.');
const tag = `v${pkg.version}`;
const { displayVersion } = require('../lib/version');
const releases = JSON.parse(
  execFileSync('gh', ['api', `repos/${repository}/releases?per_page=100`], { encoding: 'utf8' })
);
if (releases.some(release => release.tag_name === tag)) {
  console.log(`${tag} already exists; existing downloads and tags have been left intact.`);
  process.exit(0);
}
const files = readdirSync('release-assets')
  .sort()
  .map(file => join('release-assets', file));
if (
  !files.some(file => file.endsWith('Setup-x64.exe')) ||
  !files.some(file => file.endsWith('Source.zip'))
) {
  throw new Error('Release assets must include the Windows installer and corresponding source.');
}
execFileSync(
  'gh',
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
