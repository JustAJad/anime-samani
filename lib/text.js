// SPDX-License-Identifier: MPL-2.0
/**
 * Text received from a web page, without control characters and capped in length.
 * @param {unknown} value
 * @param {number} max
 */
function cleanText(value, max) {
  return String(value || '')
    .replace(/\p{Cc}/gu, '')
    .slice(0, max);
}

module.exports = { cleanText };
