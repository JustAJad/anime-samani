// SPDX-License-Identifier: MPL-2.0
/** Public labels intentionally hide the technical patch/build number. */
function displayVersion(version) {
  const match = String(version).match(/^(\d+\.\d+)(?:\.\d+)?(-[0-9A-Za-z.-]+)?$/);
  return match ? match[1] + (match[2] || '') : String(version);
}

/** One public release is reused for every patch in a minor release line. */
function releaseTag(version) {
  return `v${displayVersion(version)}.0`;
}

module.exports = { displayVersion, releaseTag };
