// SPDX-License-Identifier: MPL-2.0
// Synchronize public text only; binary downloads and technical history stay intact.
const { execFileSync } = require('node:child_process');
const { readFileSync, writeFileSync, mkdtempSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { createHash } = require('node:crypto');
const repository = 'JustAJad/anime-samani';
if (process.env.GITHUB_REPOSITORY !== repository) throw new Error('Unexpected repository');
const tag = 'v1.1.0';
const notes = readFileSync('RELEASE-NOTES.md', 'utf8');
const gh = args => execFileSync('gh', args, { encoding: 'utf8' });
const dir = mkdtempSync(join(tmpdir(), 'samani-release-text-'));
try {
  gh([
    'release',
    'download',
    tag,
    '--repo',
    repository,
    '--dir',
    dir,
    '--pattern',
    'SHA256SUMS.txt',
  ]);
  const checksumPath = join(dir, 'SHA256SUMS.txt');
  const sums = readFileSync(checksumPath, 'utf8');
  const hash = createHash('sha256').update(notes).digest('hex');
  let found = false;
  const next = sums.replace(/^[a-f0-9]{64}(\s+)RELEASE-NOTES\.md\r?$/gm, (_line, space) => {
    found = true;
    return `${hash}${space}RELEASE-NOTES.md`;
  });
  if (!found) throw new Error('Release notes missing from checksums');
  writeFileSync(join(dir, 'RELEASE-NOTES.md'), notes);
  writeFileSync(checksumPath, next);
  gh(['release', 'edit', tag, '--repo', repository, '--notes-file', 'RELEASE-NOTES.md']);
  gh([
    'release',
    'upload',
    tag,
    '--repo',
    repository,
    '--clobber',
    join(dir, 'RELEASE-NOTES.md'),
    checksumPath,
  ]);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
