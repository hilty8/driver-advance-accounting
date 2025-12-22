# 日次バッチ

- 支給日到来の給与データを対象に回収処理を行う。
- D の振込予定額（今月/翌月/翌々月）を再計算しキャッシュ。
- driver_balances_materialized と metrics_monthly を再計算/upsert する。
- 不整合チェック（負残等）を行いログに出力。
- `target_date` を指定して手動実行可能とする。
