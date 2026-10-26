// SPDX-License-Identifier: MPL-2.0
// Report logical installed size separately from compressed downloads.
const { readdirSync, statSync, writeFileSync } = require('node:fs');
const { join, relative } = require('node:path');
const root = 'dist/win-unpacked';
function walk(directory) {
  return readdirSync(directory).flatMap(name => {
    const file = join(directory, name);
    const stat = statSync(file);
    return stat.isDirectory() ? walk(file) : [{ path: relative(root, file), bytes: stat.size }];
  });
}
const files = walk(root);
const report = {
  version: require('../package.json').version,
  buildCommit: process.env.GITHUB_SHA,
  installedBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  largestFiles: files.sort((a, b) => b.bytes - a.bytes).slice(0, 15),
  downloads: readdirSync('release-assets')
    .filter(name => /\.(exe|zip)$/.test(name))
    .map(name => ({
      name,
      bytes: statSync(join('release-assets', name)).size,
    })),
};
writeFileSync('release-assets/SIZE-REPORT.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
