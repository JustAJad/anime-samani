; SPDX-License-Identifier: MPL-2.0
; Keep the assisted update page concise and put the long install path on its own line.
!macro customHeader
  !pragma warning disable 6030

  LangString perUserInstallExists 1036 "Anime Samani est déjà installé pour cet utilisateur.$\r$\n"
  LangString reinstallUpgrade 1036 "L’assistant va mettre à jour l'application."

  LangString perUserInstallExists 1033 "Anime Samani is already installed for this user.$\r$\n"
  LangString reinstallUpgrade 1033 "The wizard will update the application."

  LangString perUserInstallExists 1041 "Anime Samani はこのユーザー向けにインストール済みです。$\r$\n"
  LangString reinstallUpgrade 1041 "ウィザードがアプリケーションを更新します。"

  !pragma warning enable 6030
!macroend
