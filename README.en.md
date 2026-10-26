<div align="center">
  <img src="assets/branding/wordmark.png" alt="Anime Samani" width="760" />
  <h1>Anime Samani</h1>
  <p>Anime Sama, but better!</p>
  <p><a href="https://github.com/JustAJad/anime-samani/releases">Download</a> · <a href="README.md">Français</a> · <a href="README.ja.md">日本語</a> · <a href="https://github.com/JustAJad/anime-samani/issues/new/choose">Report an issue</a></p>
</div>

Samani is a fork of [AlexAnimateMp4's](https://github.com/AlexAnimateMp4/anime-sama-fr-desktop) desktop app, and brings many more features!

## New in 1.1

- **Configurable website address**: checks anime-sama.pw at startup, every 24 hours and after a loading failure. Samani suggests an address; you choose when to apply it. Manual entry remains available.
- **Fewer ads**: known ad slots are hidden, known ad networks are filtered and automatic external redirects are blocked. Player frames are not blocked as a group.
- **Your colors inside the site**: supported backgrounds and panels follow Samani’s theme.
- **Resource maintenance**: old backgrounds are removed, playback positions are capped at 500, window resizing writes less often and the font is injected once per page.

Find **Automatically check for new addresses**, **Hide advertisements** and **Apply my colors to the website** in **Settings → General**. Filtering cannot remove every ad; disable it if a player stops working. External player themes remain independent.

[1.1 guide](docs/releases/1.1.0.md) · [Technical documentation](docs/DEVELOPMENT.md)

## Installation

For **64-bit Windows 10 or 11**. Open [Releases](https://github.com/JustAJad/anime-samani/releases), expand **Assets**, and choose:

- **Setup** to install the app and receive updates.
- **Portable** to run it without installing.
- **Windows.zip** to extract everything yourself and open `ANIME_SAMANI.exe`.

The current version is **1.1**. Downloads are unsigned, so Windows may show you a SmartScreen or UAC unknown publisher warning.
Source code and SHA-256 checksums are included too.

## Features

- **Anime favorites** with covers and a banner to resume your last episode.
- **Image or video backgrounds**, with blur, brightness and opacity controls.
- A few **color palettes**, including the logos’ peach–pink gradient.
- **Cinema mode on episode pages**, fullscreen and quick access with `Ctrl + K` (click outside to close).
- **Discord presence** with the title and episode, if you want to share them.
- An optional **startup intro** and a **first-run guide** you can skip.
- **French, English and Japanese**, selectable in settings.
- **Beckman** for headings and buttons, with a readable mixed-case font for other text.
- **Resume** opens your last episode and restores playback position where supported.
- **In-app updates** for Setup installations: download, then restart to apply.

![Samani settings](assets/img/readme/samani-personalization-en.png)

![Discord settings](assets/img/readme/samani-discord-en.png)

## Settings

In **Settings → Personalization**, pick an image or video smaller than **250 MB**.
Background videos stay muted and can pause while you watch an episode. Samani
keeps a copy on your PC, so moving the original file won’t break the background.
Supported formats are PNG, JPEG, WebP, MP4 and WebM. If a video won’t play, try WebM.

For **Discord**, open the desktop client, then Samani. It’s already configured;
you don’t need a token or password. Settings let you hide the title and episode,
or turn presence off. The preview shows what will be sent; the
connection status tells you whether Discord is ready.

| Shortcut | Action |
| --- | --- |
| `Ctrl + K` | Quick access |
| `Alt + Home` | Home |
| `Alt + ←` / `Alt + →` | Previous / next page |
| `Ctrl + R` | Reload or retry |
| `Ctrl + ,` | Settings |
| `Ctrl + B` | Collapse / expand the sidebar |
| `Ctrl + Shift + F` | Cinema mode; `Esc` to return |
| `F11` | Fullscreen |

## To Note

*Favorites stay on your PC. On pages with a compatible favorite button, additions
and removals are linked between Samani and the website. This does not import old
website favorites or sync across devices.*

***Resume** opens the last episode from your library. Accessible HTML5 players
also restore the saved position; other players may only reopen the page.*

*Discord’s browsing clock starts with the app and continues in the tray. Watching
uses the show cover, season and episode, with a countdown when the player supplies
its duration. Pausing keeps the cover, shows a pause icon and status, and removes the countdown.
**Watch** and **About the anime** open Samani when installed, or Anime Sama in the
browser otherwise. Your browser may ask permission to open the app.*

***Setup** checks for updates and prompts to download them. You can also use
**Settings → Update**, then restart to install. Portable and ZIP
builds need manual replacement. New versions reach the app once their build on
GitHub is finished.*

*The language setting applies to the app. Anime Sama’s text and videos keep the
website’s language. A real HTTP 500 or an unavailable player may come from the
website itself. [Need help?](SUPPORT.md)*

## Run the project

With [Node.js 24](https://nodejs.org/):

```sh
git clone https://github.com/JustAJad/anime-samani.git
cd anime-samani
npm ci
npm start
```

`npm test` runs the checks. `npm run test:electron` opens the app against test
pages and needs a graphical desktop. `npm run build:win` creates Portable and ZIP
packages; on Windows, `npm run build:win:installer` adds Setup. Files go to `dist/`.

[Contributing](CONTRIBUTING.en.md) · [Changelog](CHANGELOG.md) · [Next up](ROADMAP.md) · [Credits](CREDITS.md)

---

Made with ❤️ by [Just A Jad](https://github.com/JustAJad). Huge thanks to
[AlexAnimateMp4](https://github.com/AlexAnimateMp4/anime-sama-fr-desktop) for the
original app and [raphael-as](https://github.com/raphael-as/anime-sama-fr-desktop)
for keeping it going with his own fork.

Thanks to [Bourinou](https://github.com/Bourinou) for configurable domains, resource fixes and code organization, integrated from [PR #2](https://github.com/JustAJad/anime-samani/pull/2).

Discord: **justajade**. Thanks also to the [Anime Sama team](https://anime-sama.to/) for the website and their work!

[MPL-2.0 license](LICENSE). ***Samani is an independent project, not affiliated to Anime Sama and Discord.***
