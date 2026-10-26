// SPDX-License-Identifier: MPL-2.0
// Tidy the two older release pages and their labels. App/source archives stay unchanged.
const { execFileSync } = require('node:child_process');
const { readFileSync, writeFileSync, mkdtempSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { createHash } = require('node:crypto');
const apply = process.argv.includes('--apply');
const repository = process.env.GITHUB_REPOSITORY || 'JustAJad/anime-samani';
const snapshot = process.argv.indexOf('--snapshot');
if (apply && snapshot !== -1) throw new Error('Apply mode must read current GitHub state.');
const gh = args => execFileSync('gh', args, { encoding: 'utf8' });
const api = (path, body) =>
  JSON.parse(
    execFileSync('gh', ['api', ...(body ? ['--method', 'PATCH', '--input', '-'] : []), path], {
      encoding: 'utf8',
      ...(body ? { input: JSON.stringify(body) } : {}),
    })
  );
if (apply && api(`repos/${repository}`).id !== 1432238651)
  throw new Error('This cleanup belongs to the Anime Samani repository.');
const releases =
  snapshot !== -1
    ? JSON.parse(readFileSync(process.argv[snapshot + 1], 'utf8'))
    : api(`repos/${repository}/releases?per_page=100`);
const jobs = releases
  .filter(release => ['v0.2.0', 'v0.3.0'].includes(release.tag_name))
  .map(release => {
    const version = release.tag_name.slice(1);
    const notes = readFileSync(`docs/releases/${version}.md`, 'utf8');
    const renames = release.assets
      .filter(asset =>
        /^Anime-Sama-Just-A-Jad-0\.2\.0-(Portable-x64\.exe|Setup-x64\.exe|Windows-x64\.zip)$/.test(
          asset.name
        )
      )
      .map(asset => ({ asset, name: asset.name.replace('Anime-Sama-Just-A-Jad-', 'Anime-Sama-') }));
    for (const { name } of renames)
      if (release.assets.some(asset => asset.name === name))
        throw new Error(`Existing asset would conflict: ${name}`);
    const notice =
      release.tag_name === 'v0.2.0'
        ? `Anime Sama.to Desktop 0.2.0\n\nApplication originale / Original app: AlexAnimateMp4.\nhttps://github.com/AlexAnimateMp4/anime-sama-fr-desktop\n\nMerci à raphael-as pour son travail sur le projet. / Thanks to raphael-as for his work on the project.\nhttps://github.com/raphael-as/anime-sama-fr-desktop\n\nLicence MPL-2.0. Le code correspondant reste dans Source.zip et le tag v0.2.0.\nMPL-2.0. Corresponding source remains in Source.zip and tag v0.2.0.\nhttps://github.com/JustAJad/anime-samani/tree/v0.2.0\n`
        : readFileSync('NOTICE.md', 'utf8');
    const texts = { 'RELEASE-NOTES.md': notes, 'NOTICE.md': notice };
    if (release.assets.some(asset => asset.name === 'CREDITS.md'))
      texts['CREDITS.md'] = readFileSync('CREDITS.md', 'utf8');
    return { release, notes, renames, texts };
  });
for (const job of jobs)
  console.log(
    JSON.stringify({
      tag: job.release.tag_name,
      rename: job.renames.map(item => [item.asset.name, item.name]),
      update: ['release description', ...Object.keys(job.texts), 'SHA256SUMS.txt'],
      archives: 'unchanged',
    })
  );
if (!apply) {
  console.log('Dry run only. Use --apply in the cleanup workflow to save these changes.');
  process.exit(0);
}
const directory = mkdtempSync(join(tmpdir(), 'samani-release-cleanup-'));
try {
  const uploadText = (tag, name, text) => {
    if (!['NOTICE.md', 'CREDITS.md', 'RELEASE-NOTES.md', 'SHA256SUMS.txt'].includes(name))
      throw new Error('Only release text attachments can be replaced.');
    const file = join(directory, name);
    writeFileSync(file, text);
    gh(['release', 'upload', tag, file, '--repo', repository, '--clobber']);
  };
  for (const { release, notes, renames, texts } of jobs) {
    for (const { asset, name } of renames) {
      const updated = api(`repos/${repository}/releases/assets/${asset.id}`, { name });
      if (updated.size !== asset.size || (asset.digest && updated.digest !== asset.digest))
        throw new Error('Renaming must preserve the asset bytes.');
    }
    api(`repos/${repository}/releases/${release.id}`, { body: notes });
    for (const [name, text] of Object.entries(texts)) uploadText(release.tag_name, name, text);
    const assets = api(`repos/${repository}/releases/${release.id}/assets?per_page=100`);
    const checksums =
      assets
        .filter(asset => asset.name !== 'SHA256SUMS.txt')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(asset => {
          const digest =
            texts[asset.name] !== undefined
              ? createHash('sha256').update(texts[asset.name]).digest('hex')
              : asset.digest?.replace(/^sha256:/, '');
          if (!/^[a-f0-9]{64}$/.test(digest || ''))
            throw new Error(`Missing SHA-256: ${asset.name}`);
          return `${digest}  ${asset.name}`;
        })
        .join('\n') + '\n';
    uploadText(release.tag_name, 'SHA256SUMS.txt', checksums);
    console.log(`Updated ${release.tag_name}; application and source archives preserved.`);
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
