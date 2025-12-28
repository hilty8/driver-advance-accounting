# 外部連携/データ入出力

## Stripe

- アカウント発行
- 月次請求/請求書発行

## メール通知

- 招待
- SLA
- 請求
- 承認/非承認
- SMTP 送信（初期は Railway SMTP を想定）
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM`
  - `APP_BASE_URL` を指定すると、パスワード再設定/招待リンクを生成する

## CSV インポート

- 報酬登録: `driver_external_id,work_month,payout_month,amount`
  - `payout_month` が空の場合は `work_month` から +2ヶ月で自動算出
- 給与支給: `driver_external_id,payout_date,gross_salary_amount` または `driver_external_id,payout_month,gross_salary_amount`
  - `payout_month` 指定時は、C の支払日設定から支払日を算出（日本の祝日を除外、取得不可時は土日だけ除外）
  - バリデーション失敗行はスキップし、エラー CSV を返す
  - `driver_external_id` は `drivers.external_id` を優先し、無ければ `drivers.id` を参照する

## CSV エクスポート（候補）

- D ごとの前借り残高一覧
- 月間利用額・手数料・回収額のサマリ
