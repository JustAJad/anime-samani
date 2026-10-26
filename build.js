// SPDX-License-Identifier: MPL-2.0
// Windows packaging and executable metadata editing also work from Linux.
const builder = require('electron-builder');
const pkg = require('./package.json');
const installer = process.argv.includes('--installer');
builder
  .build({
    targets: builder.Platform.WINDOWS.createTarget(
      installer ? ['nsis', 'portable', 'zip'] : ['portable', 'zip'],
      builder.Arch.x64
    ),
    publish: 'never',
    config: {
      appId: 'io.github.justajad.animesama',
      productName: pkg.displayName,
      copyright: 'Anime Samani. Original application © 2023 AlexAnimateMp4. MPL-2.0.',
      asar: true,
      protocols: [{ name: 'Anime Samani', schemes: ['anime-samani'] }],
      publish: [{ provider: 'github', owner: 'JustAJad', repo: 'anime-samani' }],
      directories: { output: 'dist' },
      files: [...pkg.files, 'node_modules/**/*'],
      extraFiles: [
        { from: 'NOTICE.md', to: 'NOTICE.md' },
        { from: 'LICENSE', to: 'APP-LICENSE.txt' },
        { from: 'CREDITS.md', to: 'CREDITS.md' },
      ],
      win: {
        icon: 'icon.ico',
        executableName: pkg.exeName,
        signtoolOptions: { publisherName: 'Anime Samani' },
        signAndEditExecutable: true,
        signExecutable: false,
        verifyUpdateCodeSignature: false,
        artifactName: 'Anime-Samani-${version}-Windows-${arch}.${ext}',
      },
      portable: { artifactName: 'Anime-Samani-${version}-Portable-${arch}.${ext}' },
      nsis: {
        oneClick: false,
        installerHeader: 'assets/installer/header.bmp',
        installerSidebar: 'assets/installer/sidebar.bmp',
        uninstallerSidebar: 'assets/installer/sidebar.bmp',
        installerLanguages: ['fr_FR', 'en_US', 'ja_JP'],
        language: '1036',
        displayLanguageSelector: true,
        perMachine: false,
        allowToChangeInstallationDirectory: true,
        deleteAppDataOnUninstall: false,
        createDesktopShortcut: true,
        artifactName: 'Anime-Samani-Setup-${arch}.${ext}',
      },
    },
  })
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
