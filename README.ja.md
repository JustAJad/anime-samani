<div align="center">
  <img src="assets/branding/wordmark.png" alt="Anime Samani" width="760" />
  <h1>Anime Samani</h1>
  <p>Anime Sama、もっと便利に！</p>
  <p><a href="https://github.com/JustAJad/anime-samani/releases">ダウンロード</a> · <a href="README.md">Français</a> · <a href="README.en.md">English</a> · <a href="https://github.com/JustAJad/anime-samani/issues/new/choose">不具合を報告</a></p>
</div>

Anime Samani は、[AlexAnimateMp4](https://github.com/AlexAnimateMp4/anime-sama-fr-desktop) のデスクトップアプリに便利な機能を加えたフォークです！

## 1.1 の新機能

- **サイトのアドレス設定**：起動時、24時間ごと、読み込みエラー時に anime-sama.pw を確認します。候補を提案し、変更は利用者が選びます。手動入力も可能です。
- **広告の削減**：既知の広告枠と広告ネットワークをフィルタリングし、外部への自動リダイレクトをブロックします。プレイヤーのフレームを一律にブロックしません。
- **サイトの配色**：対応する背景・パネルに Samani のテーマを適用します。
- **リソース管理**：古い背景を削除し、再生位置は500件まで保存。ウィンドウサイズの保存回数を減らし、フォントの重複読み込みを防ぎます。

設定 → 一般で自動アドレス確認、広告の非表示、サイトへの配色適用を切り替えられます。すべての広告を除去できるわけではありません。プレイヤーに問題がある場合は広告フィルターをオフにしてください。外部プレイヤーの配色は変更しません。

[1.1 ガイド](docs/releases/1.1.0.md) · [技術資料](docs/DEVELOPMENT.md)

## インストール

**Windows 10 / 11 の64ビット版**に対応しています。[ダウンロードページ](https://github.com/JustAJad/anime-samani/releases)の **Assets** から選んでください。

- **Setup**：インストールして、アプリ内で更新を受け取れます。
- **Portable**：インストールせずに起動できます。
- **Windows.zip**：展開して `ANIME_SAMANI.exe` を起動します。

現在のバージョンは **1.1** です。実行ファイルは未署名のため、Windows が警告を表示する場合があります。ソースコードと SHA-256 チェックサムも配布しています。

## アプリでできること

- **アニメ専用のお気に入り**にカバー画像を表示し、バナーから最後のエピソードを再開できます。
- **画像や動画の背景**に、ぼかし・明るさ・透明度を設定できます。
- ロゴに合わせたピーチ〜ピンクのグラデーションなど、**配色テーマ**を選べます。
- エピソードのページ専用の**シネマモード**、全画面表示、`Ctrl + K` のクイックアクセス。外側をクリックすると閉じます。
- 共有したい場合は、作品名やエピソードを**Discord のアクティビティ**に表示できます。
- 起動時の**イントロ**は設定でオフにできます。**初回ガイド**はスキップできます。
- **フランス語・英語・日本語**のインターフェース。
- 見出しとボタンは **Beckman**、本文は読みやすい通常のフォントで表示します。
- **再開**ボタンで最後に見たエピソードへ。対応プレイヤーでは再生位置も復元します。
- Setup 版は**アプリ内で更新**をダウンロードし、再起動して適用できます。

![Samani の設定](assets/img/readme/samani-personalization-en.png)

![Discord の設定](assets/img/readme/samani-discord-ja.png)

## 設定

設定 → カスタマイズでは、**250 MB 未満**の画像や動画を背景にできます。背景動画は無音で、エピソードの再生中に一時停止する設定もあります。Samani はファイルを PC にコピーするので、元のファイルを移動しても背景はそのまま使えます。対応形式は PNG、JPEG、WebP、MP4、WebM です。動画を再生できない場合は WebM を試してください。

**Discord** はデスクトップ版を開いてから Samani を起動してください。設定済みなので、トークンやパスワードは不要です。作品名やエピソードを隠したり、アクティビティ共有をオフにしたりできます。プレビューで送信内容、接続状態で Discord との接続を確認できます。

| ショートカット | 操作 |
| --- | --- |
| `Ctrl + K` | クイックアクセス |
| `Alt + Home` | ホーム |
| `Alt + ←` / `Alt + →` | 前のページ / 次のページ |
| `Ctrl + R` | 再読み込み・再試行 |
| `Ctrl + ,` | 設定 |
| `Ctrl + B` | サイドバーの折りたたみ・展開 |
| `Ctrl + Shift + F` | シネマモード。`Esc` で戻る |
| `F11` | 全画面表示 |

## 知っておいてほしいこと

*お気に入りは PC に保存します。対応するお気に入りボタンがあるページでは、Samani とサイトの追加・削除を連動させます。別の端末との同期や、サイトに保存済みのお気に入りの一括取り込みには対応していません。*

***再開**はライブラリの最後のエピソードを開きます。アクセス可能な HTML5 プレイヤーでは再生位置も保存・復元します。再生位置を取得できない外部プレイヤーでは、ページを開くところまでになります。*

*Discord の閲覧時間はアプリ起動時から計測し、トレイに格納しても続きます。視聴中は作品のカバー画像と再生情報に切り替わり、プレイヤーから長さを取得できれば残り時間を表示します。一時停止中はカバーと一時停止アイコンを表示し、カウントダウンを外します。視聴・作品情報ボタンは、インストール済みならSamani、なければブラウザーでAnime Samaを開きます。ブラウザーの確認が必要な場合があります。*

***Setup** 版は新しいバージョンを確認し、ダウンロードを案内します。設定 → 更新からも確認でき、再起動してインストールします。Portable 版と ZIP 版は手動で置き換えてください。GitHub でビルドが完了すると、新しいバージョンがアプリに届きます。*

*言語設定は Samani の画面に適用されます。Anime Sama の文章や動画の言語は変わりません。実際の HTTP 500 やプレイヤーの不具合は、サイト側で発生している場合もあります。[困ったときは](SUPPORT.ja.md)*

## 開発用に起動する

[Node.js 24](https://nodejs.org/) を用意してください。

```sh
git clone https://github.com/JustAJad/anime-samani.git
cd anime-samani
npm ci
npm start
```

`npm test` でチェックを実行します。`npm run test:electron` はテストページでアプリを開くため、GUI 環境が必要です。`npm run build:win` で Portable と ZIP を作成し、Windows では `npm run build:win:installer` で Setup も作成できます。出力先は `dist/` です。

[開発に参加](CONTRIBUTING.ja.md) · [変更履歴](CHANGELOG.ja.md) · [これから](ROADMAP.ja.md) · [クレジット](CREDITS.ja.md)

---

[Just A Jad](https://github.com/JustAJad) が ❤️ を込めて制作。元のアプリを作った [AlexAnimateMp4](https://github.com/AlexAnimateMp4/anime-sama-fr-desktop) と、自身のフォークをメンテナンスしてきた [raphael-as](https://github.com/raphael-as/anime-sama-fr-desktop) に感謝！

ドメイン設定、リソース修正、コード整理を提供した [Bourinou](https://github.com/Bourinou) に感謝！ [PR #2](https://github.com/JustAJad/anime-samani/pull/2) から統合しました。

Discord：**justajade**。[Anime Sama](https://anime-sama.to/)のサイト制作・運営チームにも感謝！

[MPL-2.0 ライセンス](LICENSE)。***Samani は独立したプロジェクトで、Anime Sama および Discord の公式アプリではありません。***
