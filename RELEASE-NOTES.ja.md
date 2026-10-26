# Anime Samani 1.1

[Français / English](https://github.com/JustAJad/anime-samani/blob/main/RELEASE-NOTES.md) · [全変更履歴](https://github.com/JustAJad/anime-samani/blob/main/docs/releases/1.1.0.md#日本語)

- anime-sama.pw の候補からドメインを選択するか、手動入力できます。起動時・24時間ごと・読み込みエラー時に自動確認し、変更は利用者が選びます。
- お気に入り、再開、エピソード情報、Discord のリンクが選択ドメインに追従します。
- 既知の広告ネットワーク・広告枠をフィルタリングし、ポップアップと外部への自動リダイレクトをブロックします。
- 対応するサイトの背景・パネルに Samani の配色と透明度を適用。設定 → 一般でフィルターとテーマを切り替えられます。
- **最適化と不具合修正：**
  - Samani が保存した、置き換え済みの背景コピーを整理。以前のバージョンが残した未使用のコピーも対象です。カスタム背景は引き続き利用でき、現在の背景と元ファイルは保持します。
  - 再生位置は最新500エピソードまで保存。
  - ウィンドウの大きさを1ピクセルごとに保存せず、サイズ変更が落ち着いてから保存。
  - フォントはページごとに1回だけ読み込み、スタイルシートを重複させずに置き換え。
  - 外部への自動リダイレクトとポップアップをブロックし、外部リンクの連続起動を制限。
- ドメイン変更後のエピソード情報とお気に入りの連動を修正。
- ポータルの HTML 属性の順序・引用符の違いに対応。同時検索の共有、直近の結果の再利用、検索失敗時の前回の一覧の保持。
- メインプロセスをモジュール化。ESLint・Prettier、回帰テスト、3言語の資料を更新。

ドメイン設定、リソース修正、コード整理を提供した [Bourinou](https://github.com/Bourinou) に感謝！ [PR #2](https://github.com/JustAJad/anime-samani/pull/2) から統合し、アプリ内の謝辞にもプロフィールへのリンクを追加しました。

Windows 10/11 x64 向け。Setup はアプリ内更新に対応し、Portable・ZIP は手動更新です。ソースと SHA-256 を同梱。実行ファイルは未署名です。

すべての広告を除去できるわけではありません。再生に問題が出た場合はフィルターをオフにしてください。テーマと再開はサイト・プレイヤーに依存します。

[Just A Jad](https://github.com/JustAJad) が ❤️ を込めて制作。[AlexAnimateMp4](https://github.com/AlexAnimateMp4)、[raphael-as](https://github.com/raphael-as)、[Anime Sama チーム](https://anime-sama.to/) にも感謝！ Discord：**justajade**。
