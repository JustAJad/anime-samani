# Anime Samani 2.0

[日本語](https://github.com/JustAJad/anime-samani/blob/main/RELEASE-NOTES.ja.md)

## Français

La V2 rend Samani plus fluide sans retirer ce qui existait déjà.

- Navigation `DrillIn` inspirée de Lively Wallpaper pour les panneaux et les onglets.
- Icônes de la barre latérale animées : survol, pression, changement de page au milieu du mouvement, puis arrivée sur l’état sélectionné.
- Démarrage stabilisé pour supprimer les transitions parasites pendant le premier rendu.
- Boutons principaux plus propres avec un dégradé fluide, un reflet discret et une pression plus naturelle.
- Logo original conservé et régénéré avec un anticrénelage propre pour l’app, l’icône Windows et l’installateur.
- Réglage Windows de réduction des animations respecté.
- `electron-updater` sécurisé contre une fuite potentielle d’identifiants lors de redirections inter-origines.
- Protection contre les clics de navigation concurrents.

Tes favoris, reprises, fonds personnalisés, domaines et préférences des versions 1.x sont conservés.

## English

V2 makes Samani feel smoother without removing existing features.

- Lively Wallpaper-inspired `DrillIn` navigation for panels and tabs.
- Animated sidebar icons: hover, press, page switch midway through the motion, then a clean selected-state landing.
- Stable startup with no page-transition flash during the first layout pass.
- Refined primary buttons with smooth gradient motion, a subtle highlight and natural press feedback.
- The original logo design is preserved and antialiased cleanly for the app, Windows icon and installer.
- Windows reduced-motion preferences are respected.
- `electron-updater` is patched against potential credential leakage across redirected origins.
- Concurrent navigation clicks are safely blocked.

Favorites, resume history, custom backgrounds, domains and preferences from 1.x are preserved.

## Validation / Vérifications

- 47/47 regression tests passed.
- Full Electron desktop smoke test passed.
- Windows Setup, Portable, ZIP, source archive and SHA-256 checksums are included.

Windows 10/11 x64. Downloads are unsigned, so Windows may show an unknown-publisher warning.

[Older versions / Anciennes versions](https://github.com/JustAJad/anime-samani/blob/main/docs/OLDER-VERSIONS.md)

Made with ❤️ / Fait avec ❤️ by [Just A Jad](https://github.com/JustAJad). Thanks / Merci: [AlexAnimateMp4](https://github.com/AlexAnimateMp4), [raphael-as](https://github.com/raphael-as), [Bourinou](https://github.com/Bourinou), and the [Anime Sama team](https://anime-sama.to/). Discord: **justajade**.
