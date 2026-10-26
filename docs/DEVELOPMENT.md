# Development and maintenance / Développement / 開発

## Working on 1.1

Use Node.js 24 and `npm ci`. Run `npm test` for ESLint, Prettier and unit tests; `npm run format` repairs formatting. Run `npm run test:electron` in a graphical session for navigation, settings, backgrounds, favorites, playback, domains, ad filtering, theme and linked credits. Windows CI also builds Setup, Portable and ZIP before publishing a new version.

| Area | Files and responsibility |
| --- | --- |
| Startup | `index.js`: profiles, migration, isolated windows, wiring |
| Desktop | `lib/main/desktop.js`: validated local IPC, settings, lifecycle |
| Website | `lib/main/site.js`: guarded navigation, metadata, playback |
| Discovery | `lib/main/discovery.js`, `lib/domains.js`: portal requests, cache, suggestions |
| Filtering | `lib/ads.js`: bounded ad host list, ad-slot selectors |
| Styling | `lib/website.js`, `lib/preferences.js`: serialized stylesheet replacement |
| Preload | `preload.js`: sandboxed metadata and favorite bridge; validates main frame and hostname |
| Translations | `desktop/i18n/{fr,en,ja}.json`: matching keys |
| Handoff | `handoff/open/`: HTTPS → installed app or browser; deploy with GitHub Pages |

Discovery never automatically trusts or selects a new domain. Only addresses matching the Anime Sama HTTPS format can be entered; that format alone is not proof of authenticity. Results come from anime-sama.pw, stay cached on failure and are rescanned at most once per five minutes after success. Automatic attempts are also throttled. Suggestions do not bypass navigation or IPC validation. No whole-page script or native API from the website is trusted.

The ad list matches complete hostnames or subdomains, never substrings. Filtering is limited to requests belonging to the website view. It does not block all external frames, CDNs or video files. Cosmetic rules hide known ad containers; colors apply to supported site surfaces. External player documents keep their own styles. The user can disable filtering or website theming separately. Automatic external redirects and popups remain blocked.

## Credits and permissions / Crédits et accès / 謝辞と権限

[Bourinou](https://github.com/Bourinou) contributed domain settings/discovery, resource fixes and the main-process refactor in [PR #2](https://github.com/JustAJad/anime-samani/pull/2). Keep his original commits and credit in the app, package metadata, notices and translated docs. Credit is recognition; it grants no repository permissions.

For this public repository owned by a personal account, the recommended arrangement is **credit + fork pull requests, without a collaborator invitation**. He can propose changes; the owner controls merging and releases. GitHub generates the Contributors graph from authored commits on the default branch; adding a name to a file does not create graph attribution.

| Choice | Control |
| --- | --- |
| Credit and fork PRs (recommended) | No direct write access, no settings access; owner reviews changes |
| Personal-repository collaborator | Write access, including branches and code; broader than credit only |
| Organization roles | If moved to an organization: Read, Triage, Write, Maintain, Admin provide distinct access levels |
| Branch-rule bypass | Can bypass protections; unnecessary for contributing through a fork |

Do not invite a collaborator or grant bypass solely to credit a contribution. Existing access must be checked separately in GitHub Settings if permissions need changing.

**FR :** Pour les crédits seuls, aucune invitation n’est nécessaire. Bourinou peut continuer avec son fork et des PR ; Jad choisit les fusions et publications. Les règles de contournement ne sont pas nécessaires. Sur un dépôt personnel, une invitation de collaborateur donne de l’écriture, pas un simple badge.

**日本語：** 謝辞への記載だけなら招待は不要です。フォークから PR を送れば、所有者がマージ・公開を判断できます。保護ルールの迂回権限も不要です。個人所有リポジトリの共同編集者への招待は、単なるクレジットではなく書き込み権限を与えます。

## Release checks

Keep `package.json` and `package-lock.json` at `1.1.0` and update FR/EN/JA notes together. A push to `main` runs Windows verification and publishes only if that version does not exist. The handoff workflow redeploys when `handoff/` changes. Never replace an existing release to test an update.

Before claiming live compatibility, check the current website, each external player, Discord from another account, and an installed 1.0 → 1.1 update on Windows. Local fixtures verify app behavior but cannot establish live-host compatibility or the full installed updater cycle.

## Installer filename

Setup uses `Anime-Samani-Setup-x64.exe` and its matching `.blockmap` across releases. Keep the internal package version and updater version: they determine whether an update is newer. Portable and ZIP filenames remain versioned. The stable download link is `https://github.com/JustAJad/anime-samani/releases/latest/download/Anime-Samani-Setup-x64.exe`. The 1.1 migration renames existing installer assets without rebuilding them and updates `latest.yml` and `SHA256SUMS.txt` together.

## Release text and technical history

`RELEASE-NOTES.md` (French/English) and `RELEASE-NOTES.ja.md` are the public release text. The release-note sync uses the former for the GitHub description and attached notes. Keep same-version rebuild details in `docs/releases/1.1.0.md`, `docs/releases/1.1.0.ja.md` and `docs/SIZE.md`, rather than the public release text.
