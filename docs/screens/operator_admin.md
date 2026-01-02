# 運営/管理者（Operator/Admin）画面

## 概要
- 運営/管理者向けの画面は要件確定後に詳細化する。
- 現時点ではTBDとして整理する。

## 管理者ホーム
- 画面名: 管理者ホーム
- 目的: 運用タスクの入口を提供する。
- 想定ロール: Operator/Admin
- URL: /admin
- 主要導線:
  - ログイン → /admin
- 表示項目:
  - サマリーカード（TBD）
- 操作:
  - 運用ツールへの遷移（TBD）
- 状態:
  - ローディング/エラー
- API参照:
  - TBD

## 監査ログ一覧
- 画面名: 監査ログ一覧
- 目的: 承認/否認の履歴を確認する。
- 想定ロール: Operator/Admin
- URL: /admin/audit-logs（案）
- 関連Feature/SF: F00-SF03
- 表示項目:
  - company/driver/action/timestamp
- 操作:
  - company/date範囲でフィルタ（TBD）
- 状態:
  - ローディング/空/エラー
- API参照:
  - TBD
