// SPDX-License-Identifier: MPL-2.0
// Release numbers are explicit; a rebuild must not silently turn V1 into another version.
const fs = require('node:fs');
const pkg = require('../package.json'),
  lock = require('../package-lock.json');
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) throw new Error('A stable semantic version is required.');
lock.version = pkg.version;
lock.packages[''].version = pkg.version;
fs.writeFileSync('package-lock.json', JSON.stringify(lock, null, 2) + '\n');
console.log('Build version: ' + pkg.version);
