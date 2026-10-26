# Contributing to Anime Samani

[Français](CONTRIBUTING.md) · [日本語](CONTRIBUTING.ja.md)

Keep the authors’ credits and the MPL-2.0 license. The logos are in
`assets/branding/`.

## Report a problem

Include the Samani and Windows versions, reproduction steps and exact error code.
State whether the page works in your normal browser. For Discord, include the
status shown in settings; never share a token or password. See [SUPPORT.md](SUPPORT.md).

## Development

Use Node.js 24 and `npm ci`. `npm test` runs ESLint, checks Prettier formatting
(`npm run format` fixes it), then navigation, preferences, translations
and the RPC protocol. `npm run test:electron` exercises real Electron windows with
local website and background fixtures. A graphical desktop is required; on Linux,
use an X server. On Windows, `npm run build:win:installer` verifies all three
package formats.

The website lives in an isolated `WebContentsView`. The local shell receives a
limited validated IPC API; do not expose it to remote pages. Background files
must pass through the native picker and controlled local media protocol.

Add strings to **all three** files: `desktop/i18n/fr.json`, `en.json` and `ja.json`.
Document features in French, English and Japanese. Preserve contrast and reduced-motion support. Add focused
regression tests for behavioral changes; text-only edits do not need new tests.

Send pull requests to `main` with visible behavior and verification details.
Never commit `node_modules`, `dist` or personal profiles.

## Releases

Update the changelog and release notes in all three languages. Each push to
`main` runs the Windows tests and build, then publishes a stable release with
matching source, credits and SHA-256 checksums when the release version is new.
Package versions are explicit: rebuilding 1.1 keeps 1.1.0. Set the same version in
`package.json` and `package-lock.json` when preparing a future release. Existing
releases are not overwritten; prepare a test build before changing a published
release. GitHub’s automatic token is sufficient.

For documentation-only commits, add `[skip ci]` to the commit message to avoid
publishing a new app build.

In-app updates require Setup. Also check the live website, players, Discord and
updates from a previous installation when changing those features.

RPC links use a small GitHub Pages handoff. See [link handling and deployment](docs/LINKS.md).

## Contributors and access

Thanks to [Bourinou](https://github.com/Bourinou) for [PR #2](https://github.com/JustAJad/anime-samani/pull/2). Contribute through a fork and a PR to `main`; write access is unnecessary. Credits do not grant repository permissions. The owner decides what is merged and published.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for architecture, tests and access choices. Version 1.1 uses `1.1.0` in both package files. Rebuilds keep that number; published releases are not replaced.
