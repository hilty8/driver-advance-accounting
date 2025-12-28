# 通知一覧仕様

## 目的

- C/D/O それぞれの通知を一覧で管理し、既読/未読の運用を可能にする。

## 対象通知カテゴリ（例）

- SLA: 前借り申請/振込の期限警告・超過
- Billing: 請求の作成/支払/失敗/無効化/返金
- System: 障害・エラー通知（O 向け）
- Payroll: 給与確定完了（O 向け）

## 画面要件

- 一覧表示
- 既読化（一括）
- 古い通知の自動削除（ユーザー単位で最新50件を超える分は削除）

## API（実装済み）

- `POST /notifications/list`
  - 入力: recipientType, recipientId, unreadOnly, limit, offset
  - 備考: operator は recipientId 不要
- `POST /notifications/mark-all-read`
  - 入力: recipientType, recipientId

## Stripe 関連通知

- invoice.payment_failed: O と C に通知
- invoice.paid: C に通知
- invoice.voided: O に通知
- charge.refunded: O に通知（Invoice紐付け時にステータス更新）
