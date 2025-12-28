# 収益/請求

## 収益請求

- O の収益は D の前借り手数料が主であり、C への Stripe 請求で回収する。
- C 向け請求率は D の前借り手数料（固定 5%）とは別概念とする。
- C に対する支払金額のパーセンテージは前借り金額に応じて以下の段階制とする。
  - 100 万未満: 5%
  - 100 万以上 200 万未満: 4%
  - 200 万以上 500 万未満: 3%
  - 500 万以上: 2%

## Stripe 請求フロー（運用）

1) `POST /stripe/customers` で C の Stripe Customer を作成
2) `POST /billing/run` で月次請求（Invoice）を作成し `billing_runs` に記録
3) `POST /stripe/invoices/finalize` で確定
4) `POST /stripe/invoices/send` で送信
5) `POST /stripe/webhook` で支払/失敗/無効化/返金を反映

## ステータス

- `billing_runs.stripe_status` で請求状態を追跡

## 詳細運用

- 詳細な運用は `docs/spec/billing_operations.md` を参照
