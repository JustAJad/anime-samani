# Anime Samani の開発に参加する

[Français](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md) · [日本語 README](README.ja.md)

作者のクレジットと MPL-2.0 ライセンスは残してください。ロゴは `assets/branding/` にあります。

## 不具合を報告する

Samani と Windows のバージョン、再現手順、エラーコードを書いてください。同じページが普段のブラウザーで開けるかも教えてください。Discord の問題では、設定に表示される接続状態が役立ちます。トークンやパスワードは共有しないでください。[サポート](SUPPORT.ja.md)も確認できます。

## 開発する

Node.js 24 と `npm ci` を使います。`npm test` は ESLint と Prettier の書式（`npm run format` で修正）を確認し、ナビゲーション、設定、翻訳、RPC を検証します。`npm run test:electron` は実際の Electron ウィンドウとローカルのテストページ・背景を使います。GUI 環境が必要で、Linux では X サーバーを用意してください。Windows の `npm run build:win:installer` では3種類の配布形式を作成できます。

サイトは分離された `WebContentsView` 内に表示します。ローカル画面の IPC API は用途を限定し、リクエストを検証しています。リモートページにはこの API を公開しないでください。背景ファイルは OS のファイル選択画面と、管理されたローカルプロトコルを経由させてください。

新しい文言は `desktop/i18n/fr.json`、`en.json`、`ja.json` の**3つすべて**に追加し、機能の説明もフランス語・英語・日本語で更新してください。コントラストとアニメーションを減らす設定を保ってください。動作を変える場合は必要な回帰テストを追加します。文章だけの変更に新しいテストは不要です。

プルリクエストの送り先は `main` です。何が変わるかと、確認した内容を書いてください。`node_modules`、`dist`、個人のプロファイルはコミットしないでください。

## リリースする

変更履歴とリリースノートを3言語で更新してください。`main` への push ごとに Windows のテストとビルドを実行し、ソースコード、クレジット、SHA-256 チェックサムを含む安定版を公開します。1.1を再ビルドしても1.1.0のままです。今後バージョンを上げる場合は `package.json` と `package-lock.json` を更新してください。既存のリリースは上書きしません。GitHub が自動で用意するトークンで動作します。

ドキュメントだけの変更では、コミットメッセージに `[skip ci]` を付けると、アプリの新しいビルドの公開を省略できます。

アプリ内更新は Setup 版が対象です。関連する機能を変えたときは、実際のサイト、動画プレイヤー、Discord、以前のインストールからの更新も確認してください。

RPCリンクの動作とGitHub Pagesへの公開は[こちら](docs/LINKS.md)を参照してください。

## 貢献者と権限

[PR #2](https://github.com/JustAJad/anime-samani/pull/2) を提供した [Bourinou](https://github.com/Bourinou) に感謝します。フォークから `main` に PR を送れば、書き込み権限なしで貢献できます。クレジットへの記載はリポジトリ権限を与えません。マージと公開は所有者が決めます。

構成・テスト・権限の選択肢は [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) にあります。1.1 は両方の package ファイルで `1.1.0` を使います。再ビルドでも番号を変えず、公開済みのリリースを置き換えません。
