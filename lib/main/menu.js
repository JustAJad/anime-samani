// SPDX-License-Identifier: MPL-2.0
// Application menu (keyboard accelerators) and the optional tray icon.
const { app, Menu, Tray } = require('electron');
const { join } = require('node:path');
const { siteUrl } = require('../navigation');

const ZOOM_MIN = -2;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.5;

/** @param {import('./context').Context} ctx */
function installMenus(ctx) {
  const { window, wc, repository, t } = ctx;
  const command = name => window.webContents.send('samani:command', name);
  const quit = () => {
    ctx.quitting = true;
    app.quit();
  };
  const zoom = delta =>
    wc.setZoomLevel(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, wc.getZoomLevel() + delta)));

  let tray;
  try {
    tray = new Tray(join(__dirname, '../../icon.png'));
    tray.setToolTip('Anime Samani');
    tray.on('double-click', () => window.show());
  } catch {
    /* A tray service is optional on Linux. */
  }

  function refresh() {
    const history = wc.navigationHistory;
    const appMenu = [
      { label: t('home'), accelerator: 'Alt+Home', click: () => ctx.navigate(siteUrl()) },
      {
        label: t('back'),
        accelerator: 'Alt+Left',
        click: () => history.canGoBack() && history.goBack(),
      },
      {
        label: t('forward'),
        accelerator: 'Alt+Right',
        click: () => history.canGoForward() && history.goForward(),
      },
      { label: t('reload'), accelerator: 'CmdOrCtrl+R', click: () => ctx.reload() },
      { label: t('toggleSidebar'), accelerator: 'CmdOrCtrl+B', click: () => command('sidebar') },
      { label: t('settings'), accelerator: 'CmdOrCtrl+,', click: () => command('settings') },
      { type: 'separator' },
      { label: t('quit'), click: quit },
    ];
    const viewMenu = [
      { label: t('cinema'), accelerator: 'CmdOrCtrl+Shift+F', click: () => ctx.toggleCinema() },
      { role: 'togglefullscreen', label: t('fullscreen'), accelerator: 'F11' },
      { label: t('zoomIn'), click: () => zoom(ZOOM_STEP) },
      { label: t('zoomOut'), click: () => zoom(-ZOOM_STEP) },
    ];
    const helpMenu = [
      { label: t('downloads'), click: () => ctx.openExternal(`${repository}/releases`) },
      { label: t('report'), click: () => ctx.openExternal(`${repository}/issues/new/choose`) },
      { label: t('about'), click: () => command('about') },
    ];
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        { label: 'Anime Samani', submenu: appMenu },
        { label: t('view'), submenu: viewMenu },
        { label: t('help'), submenu: helpMenu },
      ])
    );
    tray?.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Anime Samani', click: () => window.show() },
        {
          label: t('settings'),
          click: () => {
            window.show();
            command('settings');
          },
        },
        { type: 'separator' },
        { label: t('quit'), click: quit },
      ])
    );
  }

  ctx.refreshMenus = refresh;
  ctx.disposers.push(() => tray?.destroy());
  refresh();
}

module.exports = { installMenus };
