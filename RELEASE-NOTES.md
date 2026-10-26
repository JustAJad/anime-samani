# Changements / Changelog

[日本語](https://github.com/JustAJad/anime-samani/blob/main/RELEASE-NOTES.ja.md)

## Français

- Domaine du site configurable à la main ou depuis la liste d’anime-sama.pw. Recherche automatique au lancement, toutes les 24 h et après une erreur ; application du domaine à ton choix.
- Favoris, reprises, suivi des épisodes et liens Discord suivent le domaine sélectionné. La page de relais accepte les domaines officiels connus.
- Filtre des régies publicitaires connues, masquage des emplacements publicitaires et blocage des popups et redirections automatiques externes.
- Couleurs et transparence de Samani sur les fonds et panneaux compatibles du site. Options de filtre et de thème dans Paramètres → Général.
- **Optimisations et corrections de bugs :**
  - Nettoyage des copies de fonds remplacés stockées par Samani, ainsi que des copies inutilisées laissées par les versions précédentes. Les fonds personnalisés restent disponibles ; le fond actuel et les fichiers originaux sont conservés.
  - Positions de lecture limitées aux 500 épisodes les plus récents.
  - Dimensions de fenêtre enregistrées après le redimensionnement, plutôt qu’à chaque pixel.
  - Police injectée une seule fois par page et remplacement des feuilles de style sans accumulation.
  - Redirections externes automatiques et popups bloquées ; ouvertures externes rapprochées limitées.
- Correction du suivi des épisodes et des favoris après un changement de domaine.
- Lecture de la liste d’adresses compatible avec différents ordres et styles d’attributs HTML du portail. Recherches simultanées regroupées, résultats récents réutilisés et dernière liste conservée en cas d’échec.
- Processus principal organisé en modules, ESLint et Prettier, documentation revue dans les trois langues et nouveaux tests.

Merci à [Bourinou](https://github.com/Bourinou) pour les domaines configurables, les corrections de ressources et la réorganisation du code dans sa [PR #2](https://github.com/JustAJad/anime-samani/pull/2) !

**Mise à jour depuis la 1.0 :** le profil, les favoris et le fond actuel sont conservés. La recherche d’adresse propose un domaine ; tu choisis quand l’appliquer. Setup propose les mises à jour intégrées ; Portable et ZIP se remplacent manuellement.

## English

- Manually configurable website domain or selection from anime-sama.pw. Automatic checks at startup, every 24 hours and after a loading error; you choose when to switch.
- Favorites, resume, episode tracking and Discord links follow your selected domain. The handoff page accepts known official domains.
- Known ad-network filtering, hidden ad slots and blocked popups and automatic external redirects.
- Samani’s colors and transparency on supported website backgrounds and panels. Filter and theme controls in Settings → General.
- **Optimizations and bug fixes:**
  - Cleanup of replaced background copies stored by Samani, including unused copies left by earlier versions. Custom backgrounds remain available; your current background and original files are retained.
  - Saved playback positions capped at the 500 most recent episodes.
  - Window dimensions saved after resizing settles, rather than at every pixel.
  - One font injection per page and stylesheet replacement without accumulation.
  - Blocked automatic external redirects and popups; rapid external openings are throttled.
- Fixed episode tracking and favorites after switching domains.
- Portal address parsing supports different HTML attribute order and quoting. Concurrent searches share one request, recent results are reused and the last list is preserved if a search fails.
- Modular main process, ESLint and Prettier, refreshed documentation in three languages and new regression tests.

Thanks to [Bourinou](https://github.com/Bourinou) for configurable domains, resource fixes and the refactor in [PR #2](https://github.com/JustAJad/anime-samani/pull/2)!

**Upgrading from 1.0:** your profile, favorites and current background are retained. Domain discovery suggests an address; you choose when to apply it. Setup supports in-app updates; Portable and ZIP need manual replacement.

## À savoir / Limitations

Le filtrage ne supprime pas toutes les publicités ; désactive-le si un lecteur ne fonctionne plus. Le thème et la reprise dépendent du site et du lecteur. / Filtering cannot remove every ad; disable it if a player stops working. Theme and resume support depend on the website and player.

Windows 10/11 x64. Source et SHA-256 inclus / Source and SHA-256 included. Fichiers non signés / Unsigned downloads.

Fait avec ❤️ / Made with ❤️ by [Just A Jad](https://github.com/JustAJad). Merci / Thanks: [AlexAnimateMp4](https://github.com/AlexAnimateMp4), [raphael-as](https://github.com/raphael-as), [Bourinou](https://github.com/Bourinou), [Anime Sama](https://anime-sama.to/). Discord : **justajade**.
