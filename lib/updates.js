// SPDX-License-Identifier: MPL-2.0
// In-app updates for the Windows Setup build. Portable and development builds never update.
const FIRST_CHECK_DELAY_MS = 15000;
const texts = {
  fr: ['Une mise à jour est disponible', 'Télécharger', 'Plus tard'],
  en: ['An update is available', 'Download', 'Later'],
  ja: ['更新があります', 'ダウンロード', '後で'],
};

/**
 * @param {Electron.App} app
 * @param {Electron.BrowserWindow|null} window
 * @param {object} options
 * @param {() => void} options.notify Called whenever the state changes.
 * @param {() => string} [options.language]
 * @param {() => void} [options.beforeInstall] Lets the app stop intercepting window closes.
 * @param {string} [options.minimumReleaseDate] Releases published earlier are ignored, so a
 *   rebuild can supersede preview packages that carry a larger version number.
 */
function installUpdates(app, window, options) {
  const { notify, language = () => 'fr', beforeInstall = () => {} } = options;
  const minimumReleaseDate = Date.parse(options.minimumReleaseDate || '') || 0;
  let state = { status: 'unsupported' };
  let updater;
  if (process.platform === 'win32' && app.isPackaged && !process.env.PORTABLE_EXECUTABLE_FILE) {
    updater = require('electron-updater').autoUpdater;
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowPrerelease = false;
    const set = (status, extra = {}) => {
      state = { status, ...extra };
      notify();
    };
    updater.on('checking-for-update', () => set('checking'));
    updater.on('update-available', info => {
      if (Date.parse(info.releaseDate) < minimumReleaseDate) return set('current');
      set('available', { version: info.version });
      const [message, download, later] = texts[language()] || texts.en;
      const { dialog } = require('electron');
      dialog
        .showMessageBox(window, {
          type: 'info',
          message,
          detail: info.version,
          buttons: [download, later],
          cancelId: 1,
        })
        .then(result => {
          if (result.response === 0) updater.downloadUpdate().catch(() => {});
        });
    });
    updater.on('update-not-available', () => set('current'));
    updater.on('download-progress', p => set('downloading', { percent: Math.round(p.percent) }));
    updater.on('update-downloaded', () => set('downloaded'));
    updater.on('error', () => set('error'));
    const timer = setTimeout(() => updater.checkForUpdates().catch(() => {}), FIRST_CHECK_DELAY_MS);
    timer.unref();
  }
  return {
    state: () => state,
    async action(action) {
      if (!updater) return state;
      if (action === 'check') await updater.checkForUpdates().catch(() => {});
      if (action === 'download' && state.status === 'available') {
        await updater.downloadUpdate().catch(() => {});
      }
      if (action === 'install' && state.status === 'downloaded') {
        beforeInstall();
        updater.quitAndInstall(false, true);
      }
      return state;
    },
  };
}

module.exports = { installUpdates };
