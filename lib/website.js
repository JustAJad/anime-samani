// SPDX-License-Identifier: MPL-2.0
// Samani's font and colours applied to the Anime Sama pages.
const { readFileSync } = require('node:fs');
const { isSiteUrl } = require('./navigation');
const { websiteCss } = require('./preferences');

// FontFace bytes bypass the site's own font-src policy; the script is built once per launch.
function fontScript(base64) {
  return `(async () => {
    if ([...document.fonts].some(font => font.family === 'Beckman')) return;
    const bytes = Uint8Array.from(atob(${JSON.stringify(base64)}), c => c.charCodeAt(0));
    const face = new FontFace('Beckman', bytes.buffer);
    await face.load();
    document.fonts.add(face);
  })()`;
}

/**
 * @param {Electron.WebContents} webContents
 * @param {string} fontPath
 */
function createWebsiteStyler(webContents, fontPath) {
  const script = fontScript(readFileSync(fontPath).toString('base64'));
  let cssKey;
  // Serialised so overlapping updates never leave two stylesheets behind.
  let queue = Promise.resolve();
  const run = task =>
    (queue = queue
      .then(() => (isSiteUrl(webContents.getURL()) ? task() : undefined))
      .catch(() => {
        /* Navigation may replace the document between updates. */
      }));
  return {
    injectFont: () => run(() => webContents.executeJavaScript(script)),
    /** @param {object} preferences */
    applyCss: preferences =>
      run(async () => {
        // A key from a previous document is meaningless; failing to remove it must not block the new one.
        if (cssKey) await webContents.removeInsertedCSS(cssKey).catch(() => {});
        cssKey = await webContents.insertCSS(websiteCss(preferences));
      }),
  };
}

module.exports = { createWebsiteStyler };
