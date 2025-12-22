# ドメインルール

## 金額・丸め

- 金額は整数円で扱う。
- 手数料は切り上げで算出する。

## 前借り上限

- `advance_limit = max(0, floor(unpaid_confirmed_earnings * limit_rate) - advance_balance)`
- `limit_rate` は C ごとに設定（例: 80%）。
- 既に承認済みの前借りは、後から上限率を下げても影響しない。

## ステータス

- 前借り: `requested/rejected/approved/payout_instructed/paid/settling/settled/written_off`
- 給与: `planned/processed`
- 画面上の表示文言は簡略化してよいが、内部状態の対応は固定する。

## 前借り残高の整合性

- 前借り残高は常に非負。
- 負残が発生した場合は異常としてログ/アラート対象。
