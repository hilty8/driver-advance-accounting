# ドライバー（Driver）画面

## ドライバーホーム
- 画面名: ドライバーホーム
- 目的: 前借り可能額の確認と申請、履歴の参照を行う。
- 想定ロール: Driver
- URL: /driver
- 関連Feature/SF: F03-SF01, F04-SF03
- 主要導線:
  - ログイン → /driver
  - 前借り申請
  - 申請履歴の参照
- 表示項目:
  - 前借り可能額/利用中合計（F03）
  - 申請フォーム
  - 申請履歴（否認理由を含む）
- 操作:
  - 前借り申請
- 状態:
  - ローディング/空/エラー
  - 409: 二重実行/状態競合（「既に処理済みです」等のユーザー向け表示）
- API参照:
  - GET /drivers/{id}/advance-availability
  - POST /drivers/{id}/advances
  - GET /drivers/{id}/advances
  - OpenAPI: docs/spec/openapi_min.yaml

## 前借り申請履歴
- 画面名: 前借り申請履歴
- 目的: 申請履歴と否認理由を確認できる。
- 想定ロール: Driver
- URL: /driver（同一画面内セクション）
- 表示項目:
  - 申請日
  - 金額
  - ステータス
  - 否認理由（否認時のみ）
- 操作:
  - 表示のみ
- 状態:
  - ローディング/空/エラー
- API参照:
  - GET /drivers/{id}/advances

## 将来案（後回し）
- /driver/advances に履歴を分離する可能性がある。
- ただし当面は /driver に統一する。
