# 請求運用

## 目的

- 変動する月次請求を Invoice で確定し、支払/失敗を追跡する。

## 運用フロー

1) `POST /stripe/customers`
- C の Stripe Customer を作成（stripe_customer_id を保存）

2) `POST /billing/run`
- 月次集計を元に請求額を算出
- Invoice を作成し、`billing_runs` に記録

3) `POST /stripe/invoices/finalize`
- Invoice を確定（`stripe_status` 更新）

4) `POST /stripe/invoices/send`
- Invoice を送信

5) `POST /stripe/webhook`
- 支払/失敗/無効化/返金を反映

## ステータス管理

- `billing_runs.stripe_status` を主状態とする
  - pending / invoice_created / paid / payment_failed / void / refunded / stripe_disabled / missing_customer / amount_too_large

## 失敗時の運用

- `invoice.payment_failed`
  - O に通知（critical）
  - C に通知（critical）
- `stripe_disabled`
  - Stripe 設定が未完了のため、顧客への手動請求に切り替える
- `missing_customer`
  - `POST /stripe/customers` を実行し、再度 `POST /billing/run`
- `amount_too_large`
  - 金額が Number で扱えないため、手動請求に切り替える

## 再試行

- 同月同社で `POST /billing/run` を再実行しても `billing_runs` は upsert される（冪等）
- 再試行ポリシーは SLA/運用設計確定後に追記
