// SPDX-License-Identifier: MPL-2.0
// Saved playback positions, capped so the store cannot grow forever.
const MAX_ENTRIES = 500;

/**
 * @param {{store: Record<string, any>, get(key: string): any, set(key: string, value: any): void, has(key: string): boolean}} store
 *   An electron-store instance created with `accessPropertiesByDotNotation: false`.
 * @param {number} [limit]
 */
function createProgress(store, limit = MAX_ENTRIES) {
  const prune = () => {
    const entries = Object.entries(store.store);
    if (entries.length <= limit) return;
    entries.sort(([, a], [, b]) => (b?.updatedAt || 0) - (a?.updatedAt || 0));
    store.store = Object.fromEntries(entries.slice(0, limit));
  };
  prune();
  return {
    /** @param {string} key */
    get: key => store.get(key),
    /** @param {string} key @param {number} time @param {number} duration */
    save(key, time, duration) {
      const added = !store.has(key);
      store.set(key, { time, duration, updatedAt: Date.now() });
      if (added) prune();
    },
  };
}

module.exports = { MAX_ENTRIES, createProgress };
