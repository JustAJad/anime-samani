# Historique / Changelog

[日本語](CHANGELOG.ja.md)

## 1.1.0

Domain selection and automatic discovery, ad filtering and website theme integration. Resource fixes and modular main process contributed by [Bourinou](https://github.com/Bourinou) in [PR #2](https://github.com/JustAJad/anime-samani/pull/2). Linked contributor credits, French/English/Japanese docs and regression checks refreshed. / Domaines et détection automatique, filtre publicitaire et thème du site ; crédits et documentation mis à jour.

## 1.0.0

Lecture/pause et liens Regarder / À propos dans Discord, réglages RPC simplifiés,
texte courant sans capitales forcées, guide au premier lancement uniquement,
lecture des fonds vidéo par plages d’octets et nouvelles captures.
/ Discord play/pause and Watch / About links, simpler RPC settings, mixed-case body
text, a first-run-only tour, byte-range video backgrounds and fresh screenshots.

Beckman, japonais, reprise du dernier épisode et de la position sur lecteurs compatibles,
favoris liés au site, chronos et couvertures Discord, mises à jour intégrées à Setup.
/ Beckman, Japanese UI, episode/position resume on supported players, linked website
favorites, Discord clocks and covers, and in-app Setup updates.

## 0.3.1

Textes et crédits simplifiés, liens mis à jour et anciens noms de téléchargement
nettoyés. / Simpler wording and credits, updated links and cleaner older download names.

## 0.3.0 — Anime Samani

Nouvelle interface, logos, thèmes, fonds image/vidéo, favoris, mode cinéma et
présence Discord. Français par défaut, anglais disponible dans les réglages.

New interface, logos, themes, image/video backgrounds, favorites, cinema mode
and Discord presence. French by default, with English available in settings.

## 0.2.0 — Anime Sama.to Desktop

Mise à jour du domaine, corrections du chargement et des réglages, ajout des
versions Windows. / Domain update, loading and settings fixes, and Windows packages.

## 0.1.1 — Projet d’origine / Original project

Notes d’AlexAnimateMp4 conservées ci-dessous. / AlexAnimateMp4’s original notes are preserved below.

<div id="changelog">
    <h1 id="changelog-title">0.1.1</h1>
    <h3 id="changelog-fixed">Fixed</h3>
    <div id="changelog-fixed-body">
        <ul>
            <h3><a href="./index.js">index.js</a></h3>
            <li>Fixed error <a href="https://source.chromium.org/chromium/chromium/src/+/main:net/base/net_error_list.h;l=35" target="_blank">-3</a>.</li>
            <li>Inversion of the value of the <code>DISCORD_RICH_PRESENCE</code> setting in the condition of the <code>close</code> event when this one is <strong>disabled</strong>.</li>
            <li>Added <strong>cross-software</strong> compatibility for <code>settings</code>.</li>
        </ul>
    </div>
    <h1 id="changelog-old">To view older changelogs, please refer to <a id="changelog-old-link" href="https://github.com/AlexAnimateMp4/anime-sama-fr-desktop/releases">Github releases</a>.</h1>
</div>
