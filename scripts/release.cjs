// SPDX-License-Identifier: MPL-2.0
// Run by GitHub Actions after Windows tests and packaging pass.
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
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
const existing = releases.find(release => release.tag_name === tag);
const rebuild = process.env.SAMANI_REBUILD_VERSION === '1.1.0' && pkg.version === '1.1.0';
if (process.env.SAMANI_REBUILD_VERSION && !rebuild)
  throw new Error('Only the explicitly requested 1.1.0 rebuild is supported.');
if (existing && !rebuild) {
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
if (existing) {
  if (repository !== 'JustAJad/anime-samani') throw new Error('Unexpected rebuild repository');
  // Upload payloads and matching source first; publish the update manifest last.
  const manifest = files.find(file => file === join('release-assets', 'latest.yml'));
  if (!manifest) throw new Error('Rebuilt release requires updater metadata');
  execFileSync(
    'gh',
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
  execFileSync('gh', ['release', 'upload', tag, manifest, '--repo', repository, '--clobber'], {
    stdio: 'inherit',
  });
  execFileSync(
    'gh',
    ['release', 'edit', tag, '--repo', repository, '--notes-file', 'RELEASE-NOTES.md'],
    { stdio: 'inherit' }
  );
  console.log(`Rebuilt ${tag} from ${commit}; source commit is recorded in package-info.json.`);
  process.exit(0);
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
execFileSync('gh', ['release', 'edit', tag, '--repo', repository, '--latest'], {
  stdio: 'inherit',
});

// Keep earlier downloads available without competing with the current release.
for (const archived of [
  {
    tag: 'v1.1.0',
    title: 'Anime Samani 1.1 · Older version',
    notes: 'docs/releases/1.1.0.md',
  },
  { tag: 'v1.0.0', title: 'Anime Samani 1.0 · Older version' },
]) {
  const release = releases.find(item => item.tag_name === archived.tag);
  if (!release) continue;
  const notice =
    '> **Older version / Ancienne version / 旧バージョン.** ' +
    '[Download the latest stable release](https://github.com/JustAJad/anime-samani/releases/latest).';
  const archivedNotes = archived.notes ? readFileSync(archived.notes, 'utf8') : release.body || '';
  const body = `${notice}\n\n${archivedNotes}`;
  execFileSync(
    'gh',
    [
      'api',
      '--method',
      'PATCH',
      `repos/${repository}/releases/${release.id}`,
      '-f',
      `name=${archived.title}`,
      '-f',
      `body=${body}`,
      '-f',
      'make_latest=false',
    ],
    { stdio: 'inherit' }
  );
  if (archived.notes) {
    const directory = mkdtempSync(join(tmpdir(), 'samani-older-release-'));
    try {
      execFileSync(
        'gh',
        [
          'release',
          'download',
          archived.tag,
          '--repo',
          repository,
          '--dir',
          directory,
          '--pattern',
          'SHA256SUMS.txt',
        ],
        { stdio: 'inherit' }
      );
      const checksumPath = join(directory, 'SHA256SUMS.txt');
      const notesPath = join(directory, 'RELEASE-NOTES.md');
      const hash = createHash('sha256').update(archivedNotes).digest('hex');
      const checksums = readFileSync(checksumPath, 'utf8').replace(
        /^[a-f0-9]{64}(\s+)RELEASE-NOTES\.md\r?$/gm,
        `${hash}$1RELEASE-NOTES.md`
      );
      writeFileSync(notesPath, archivedNotes);
      writeFileSync(checksumPath, checksums);
      execFileSync(
        'gh',
        [
          'release',
          'upload',
          archived.tag,
          '--repo',
          repository,
          '--clobber',
          notesPath,
          checksumPath,
        ],
        { stdio: 'inherit' }
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
}
