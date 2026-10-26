const fs = require('node:fs');
fs.writeFileSync(
  'release-assets/package-info.json',
  JSON.stringify(require('../package.json'), null, 2)
);
