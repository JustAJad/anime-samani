# Download and installed size / Taille / 容量

## Measurements before this rebuild

Measured from the published Windows x64 ZIP for 1.1.0. Units below are decimal MB (1 MB = 1,000,000 bytes).

| Item | Bytes | MB |
| --- | ---: | ---: |
| Extracted application | 378709068 | 378.71 |
| Electron executable | 249825792 | 249.83 |
| All Chromium locale packs | 51195226 | 51.20 |
| App code, dependencies and assets archive | 4672948 | 4.67 |
| ZIP download | 155803267 | 155.80 |

The Electron executable alone exceeds 100 MB. Keeping the current engine, media codecs, graphics support and all locales means the installed app cannot reach 100 MB. Removing features or downgrading the runtime is outside the requested scope.

This rebuild uses maximum lossless archive compression and removes only the unused packaged Windows icon source and README wordmark. The executable still has its icon, and the runtime PNG icons and logos remain present. Compression trades build time for smaller downloads; it does not reduce extracted runtime bytes. No executable packer or filesystem compression is used.

Each rebuilt release includes `SIZE-REPORT.json` with measured installed bytes, its largest files and download sizes. `package-info.json` records the source commit. The original tag remains historical; use the matching Source.zip for these rebuilt downloads.

**FR :** Moins de téléchargement ne signifie pas moins de place après installation. Le moteur Electron représente l’essentiel de la taille ; passer sous 100 Mo installés sans compromis n’est pas réalisable. Consulte `SIZE-REPORT.json` pour les mesures du rebuild. Les fonctions, langues, codecs et accélération graphique sont conservés.

**日本語：** ダウンロード容量とインストール後の容量は別です。容量の大部分は Electron です。機能を維持したまま100 MB未満にすることはできません。再ビルドの実測値は `SIZE-REPORT.json` に記録します。機能・言語・コーデック・グラフィックス機能は保持します。
