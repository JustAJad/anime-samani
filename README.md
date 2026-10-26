<div align="center">
  <img src="assets/branding/wordmark.png" alt="Anime Samani" width="760" />
  <h1>Anime Samani</h1>
  <p>Anime Sama, mais en mieux !</p>
  <p><a href="https://github.com/JustAJad/anime-samani/releases">Télécharger</a> · <a href="README.en.md">English</a> · <a href="README.ja.md">日本語</a> · <a href="https://github.com/JustAJad/anime-samani/issues/new/choose">Signaler un souci</a></p>
</div>

Anime Samani est un fork de l'application de [AlexAnimateMp4](https://github.com/AlexAnimateMp4/anime-sama-fr-desktop), qui te donne plus de fonctionnalités !

## Nouvelle version (1.1) sortie !

Une adresse de site configurable, moins de publicités, tes couleurs dans le site,
et **des optimisations et des bugs corrigés** pour mieux gérer les ressources de l’app.
Les fonds personnalisés restent disponibles : seul le stockage des copies inutilisées est nettoyé.

[Liste complète des changements de la 1.1](docs/releases/1.1.0.md#français) · [Release et téléchargements](https://github.com/JustAJad/anime-samani/releases/tag/v1.1.0)

## Installation

Pour **Windows 10 ou 11, en 64 bits**. Dans les [téléchargements](https://github.com/JustAJad/anime-samani/releases), ouvre **Assets** et choisis :

- **[Setup](https://github.com/JustAJad/anime-samani/releases/latest/download/Anime-Samani-Setup-x64.exe)** pour installer l’app et recevoir les mises à jour.
- **Portable** pour la lancer sans installation.
- **Windows.zip** pour tout extraire toi-même, puis ouvrir `ANIME_SAMANI.exe`.

Setup garde le nom `Anime-Samani-Setup-x64.exe` d’une version à l’autre ; Portable et ZIP portent leur numéro de version.

La version actuelle est la **1.1**. Les téléchargements ne sont pas signés. Windows peut donc
afficher un avertissement. Le code source et les sommes SHA-256 sont aussi fournis.

**Taille de l’app :** la compression réduit le téléchargement, pas la taille installée. Le paquet 1.1 initial occupe environ 379 Mo après extraction, dont environ 250 Mo pour l’exécutable Electron. Descendre sous 100 Mo installés sans retirer de composants ou changer de moteur n’est pas possible. [Détails](docs/SIZE.md).

## Ce qu’il y a dans l’app

- La fonctionalité des **favoris**, avec leurs couvertures et une bannière pour reprendre le dernier épisode.
- Des **fonds image ou vidéo**, avec flou, luminosité et transparence.
- Quelques **palettes de couleurs**, dont le dégradé pêche–rose du thème Samani.
- Un **mode cinéma**, le plein écran et un accès rapide avec `Ctrl + K` (cliquer à côté pour le fermer).
- Une **présence Discord** mise à jour avec le titre et l’épisode, si tu veux les partager.
- **Reprendre** pour rouvrir le dernier épisode, avec la position sauvegardée quand le lecteur le permet.
- Les **mises à jour dans l’app** avec la version **Setup**.

![Les réglages de Samani](assets/img/readme/samani-personalization.png)

![Les réglages Discord](assets/img/readme/samani-discord-fr.png)

## Réglages

Dans **Paramètres → Personnalisation**, tu peux choisir une image ou une vidéo de
moins de **250 Mo**. Les vidéos de fond restent muettes et peuvent se mettre en
pause pendant un épisode. Samani garde une copie du fichier sur ton PC ; déplacer
l’original ne casse donc pas ton fond. Les formats acceptés sont PNG, JPEG, WebP,
MP4 et WebM. Si une vidéo ne passe pas, essaie un WebM.

Si Anime Sama change d’adresse, va dans **Paramètres → Général → Domaine du site** :
saisis le nouveau domaine ou clique sur **Chercher sur anime-sama.pw** pour choisir
dans la liste officielle. Tes favoris et reprises suivent automatiquement.

Les options **Chercher automatiquement les nouvelles adresses**, **Masquer les publicités**
et **Appliquer mes couleurs au site** sont dans **Paramètres → Général**.
Le filtre ne supprime pas toutes les publicités ; désactive-le si un lecteur ne fonctionne plus.
Le thème des lecteurs externes reste indépendant.

Pour **Discord**, ouvre le client de bureau, puis Samani. L’application est déjà
configurée : pas besoin de jeton ni de mot de passe. Dans les réglages, tu peux
masquer le titre et l’épisode, ou désactiver la présence.
L’aperçu montre ce qui sera envoyé ; l’état de connexion te dit si Discord est prêt.

| Raccourci | Action |
| --- | --- |
| `Ctrl + K` | Accès rapide |
| `Alt + Home` | Accueil |
| `Alt + ←` / `Alt + →` | Page précédente / suivante |
| `Ctrl + R` | Actualiser ou réessayer |
| `Ctrl + ,` | Paramètres |
| `Ctrl + B` | Réduire / ouvrir la barre latérale |
| `Ctrl + Maj + F` | Mode cinéma ; `Échap` pour revenir |
| `F11` | Plein écran |

## À savoir

*Les favoris restent sur ton PC. Sur une page avec un bouton de favoris compatible,
les ajouts et retraits sont liés entre Samani et le site. Ce n’est pas une
synchronisation entre appareils ni un import des anciens favoris du site.*

***Reprendre** rouvre le dernier épisode de la bibliothèque. Sur les lecteurs HTML5
accessibles, Samani garde la position et la restaure. Certains lecteurs externes
ne la fournissent pas : dans ce cas, seule la page est retrouvée.*

*Le chrono Discord de navigation part de l’ouverture de l’app et continue en
arrière-plan. Pendant un épisode, la couverture et les infos de lecture prennent
sa place ; le temps restant n’apparaît que si le lecteur fournit une durée.
La pause garde la couverture, affiche « En pause » avec une petite icône, et retire
le compte à rebours. Les boutons **Regarder** et **À propos de l’anime** ouvrent
Samani si elle est installée, sinon Anime Sama dans le navigateur. Le navigateur
peut demander l’autorisation d’ouvrir l’app.*

*Avec **Setup**, Samani cherche les nouvelles versions et propose de les télécharger.
Tu peux aussi vérifier dans **Paramètres → Mise à jour**, puis
redémarrer pour installer. Portable et ZIP se remplacent manuellement. Les nouvelles
versions arrivent dans l’app une fois leur construction terminée sur GitHub.*

*Le choix de langue concerne l’app. Les textes et vidéos d’Anime Sama gardent la
langue du site. Une vraie erreur HTTP 500 ou un lecteur indisponible peut venir
du site lui-même. [Besoin d’aide ?](SUPPORT.md)*

## Pour lancer le projet

Avec [Node.js 24](https://nodejs.org/) :

```sh
git clone https://github.com/JustAJad/anime-samani.git
cd anime-samani
npm ci
npm start
```

`npm test` lance les vérifications. `npm run test:electron` ouvre l’app sur des
pages de test et demande un bureau graphique. `npm run build:win` crée le
portable et le ZIP ; sur Windows, `npm run build:win:installer` ajoute Setup.
Les fichiers arrivent dans `dist/`.

[Contribuer](CONTRIBUTING.md) · [Historique](CHANGELOG.md) · [Pour la suite](ROADMAP.md) · [Crédits](CREDITS.md)

---

Fait avec ❤️ par [Just A Jad](https://github.com/JustAJad). Un grand merci à
[AlexAnimateMp4](https://github.com/AlexAnimateMp4/anime-sama-fr-desktop) pour l’app
d’origine, [raphael-as](https://github.com/raphael-as/anime-sama-fr-desktop)
pour le travail de son propre fork et à [Bourinou](https://github.com/Bourinou) pour sa contribution dans les domaines configurables, les corrections de ressources et la réorganisation du code !

***Discord : justajade***. Merci aussi à l’équipe [Anime Sama](https://anime-sama.to/) pour le site et son travail !

[Licence MPL-2.0](LICENSE). ***Samani est un projet indépendant non affilié à Anime Sama et Discord.***
