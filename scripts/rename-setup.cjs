// SPDX-License-Identifier: MPL-2.0
// Rename the existing 1.1 installer without rebuilding its bytes.
const { execFileSync } = require('node:child_process');
const { readFileSync, writeFileSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const repository = 'JustAJad/anime-samani';
const tag = 'v1.1.0';
const oldName = 'Anime-Samani-1.1.0-Setup-x64.exe';
const newName = 'Anime-Samani-Setup-x64.exe';

function metadata(latest, sums) {
  if (!latest.includes(oldName) && !latest.includes(newName))
    throw new Error('Unexpected updater installer path');
  if (!sums.includes(oldName) && !sums.includes(newName))
    throw new Error('Installer missing from checksums');
  const nextLatest = latest.replaceAll(oldName, newName);
  const hash = createHash('sha256').update(nextLatest).digest('hex');
  let updated = false;
  const nextSums = sums
    .replaceAll(oldName, newName)
    .replace(/^[a-f0-9]{64}(\s+)latest\.yml\r?$/gm, (_line, space) => {
      updated = true;
      return `${hash}${space}latest.yml`;
    });
  if (!updated) throw new Error('latest.yml missing from checksums');
  return { latest: nextLatest, sums: nextSums };
}

function run() {
  if (process.env.GITHUB_REPOSITORY !== repository) throw new Error('Unexpected repository');
  const gh = args => execFileSync('gh', args, { encoding: 'utf8' });
  const release = JSON.parse(gh(['api', `repos/${repository}/releases/tags/${tag}`]));
  const renames = [];
  for (const suffix of ['', '.blockmap']) {
    const old = release.assets.find(a => a.name === oldName + suffix);
    const current = release.assets.find(a => a.name === newName + suffix);
    if (old && current) throw new Error('Conflicting installer assets');
    if (!old && !current) throw new Error('Missing installer asset');
    if (old) renames.push({ asset: old, name: newName + suffix });
  }
  const dir = mkdtempSync(join(tmpdir(), 'samani-setup-name-'));
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
      'latest.yml',
      '--pattern',
      'SHA256SUMS.txt',
    ]);
    const latest = readFileSync(join(dir, 'latest.yml'), 'utf8');
    const sums = readFileSync(join(dir, 'SHA256SUMS.txt'), 'utf8');
    const next = metadata(latest, sums);
    for (const { asset, name } of renames) {
      const changed = JSON.parse(
        gh([
          'api',
          '--method',
          'PATCH',
          `repos/${repository}/releases/assets/${asset.id}`,
          '-f',
          `name=${name}`,
        ])
      );
      if (changed.id !== asset.id || changed.size !== asset.size || changed.digest !== asset.digest)
        throw new Error('Renaming changed asset identity or bytes');
    }
    if (latest !== next.latest || sums !== next.sums) {
      writeFileSync(join(dir, 'latest.yml'), next.latest);
      writeFileSync(join(dir, 'SHA256SUMS.txt'), next.sums);
      gh([
        'release',
        'upload',
        tag,
        '--repo',
        repository,
        '--clobber',
        join(dir, 'latest.yml'),
        join(dir, 'SHA256SUMS.txt'),
      ]);
    }
    console.log('Setup and blockmap names, updater paths and checksums synchronized.');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
if (require.main === module) run();
module.exports = { metadata };
