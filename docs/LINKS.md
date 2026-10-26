# Liens Discord / Discord links / Discordのリンク

## Français

Les boutons RPC utilisent `https://justajad.github.io/anime-samani/open/`.
Cette page statique tente d’ouvrir `anime-samani://open`, puis revient au site si
l’app ne s’ouvre pas. Un navigateur peut demander une confirmation ; une page web
ne peut pas détecter à coup sûr si une application est installée. Les boutons
« Ouvrir Samani » et « Continuer sur le site » restent disponibles.

Le paramètre `url` accepte uniquement une URL HTTPS sur les domaines connus `.si`, `.tv`, `.to`, `.org`, `.fr` ou `.eu` (avec ou sans `www`), sans identifiants ni port particulier. Le paramètre `episode`
est limité à 160 caractères. Le destinataire natif valide à nouveau le lien.
Un lien Regarder conserve la page et l’épisode dans Samani. Le site web gère son
propre choix d’épisode lorsque le lien s’ouvre dans le navigateur.

Le workflow `.github/workflows/handoff.yml` déploie seulement `handoff/` avec
GitHub Pages. Il ne publie pas l’app Windows. L’administrateur doit activer
**Pages → Source : GitHub Actions** et autoriser `main` pour la version publiée, dans l’environnement `github-pages`.
Le workflow demande uniquement la lecture du code et les droits Pages/OIDC.
Aucun jeton utilisateur n’est à ajouter.

## English

RPC buttons use `https://justajad.github.io/anime-samani/open/`. This static page
tries `anime-samani://open`, then falls back to the website if the app does not
open. Browsers may ask for confirmation; a web page cannot reliably detect an
installed app. Open Samani and Continue on the website remain available.

Only HTTPS Anime Sama URLs without credentials or custom ports are accepted.
Episode labels are limited to 160 characters and native code validates the link
again. Watch links preserve the page and episode in Samani; the website controls
its own episode selection on browser fallback.

The handoff workflow deploys only `handoff/`, not Windows releases. Enable
**Pages → Source: GitHub Actions** and allow `main` for production in the `github-pages` environment. No user token is required.

## 日本語

RPCボタンは `https://justajad.github.io/anime-samani/open/` を経由します。
`anime-samani://open` を試し、アプリが開かなければサイトへ移動します。
ブラウザーの確認が必要な場合があり、インストール済みかどうかを確実に
判定することはできません。アプリ用・サイト用のボタンも表示します。

許可するのは認証情報や特殊なポートを含まないAnime SamaのHTTPS URLだけです。
エピソード名は160文字までで、アプリでも再検証します。Samaniではページと
エピソードを引き継ぎますが、ブラウザーではサイト側のエピソード選択に従います。

管理者はPagesのソースをGitHub Actionsにし、`github-pages` 環境で`main` を許可してください。ワークフローは案内ページ
だけを公開し、Windowsアプリは公開しません。ユーザーのトークンは不要です。

## 1.1

Les domaines configurables et la liste officielle viennent de la contribution de [Bourinou](https://github.com/Bourinou) ([PR #2](https://github.com/JustAJad/anime-samani/pull/2)). Le code natif réécrit les anciens liens vers le domaine choisi. / Configurable domains come from Bourinou’s contribution. Native code migrates old links to the selected domain. / ドメイン設定は Bourinou の貢献です。アプリは古いリンクを選択したドメインに変換します。
