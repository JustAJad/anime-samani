const fs = require('node:fs');
fs.writeFileSync(
  'release-assets/package-info.json',
  JSON.stringify({ ...require('../package.json'), buildCommit: process.env.GITHUB_SHA }, null, 2)
);
