// SPDX-License-Identifier: MPL-2.0
/**
 * Public version label: a zero patch is dropped ("1.0.0" → "1.0"), anything else is unchanged.
 * @param {string} version
 */
function displayVersion(version) {
  return String(version).replace(/^(\d+\.\d+)\.0$/, '$1');
}

module.exports = { displayVersion };
