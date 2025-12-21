# シーケンス図: 支給日到来→日次バッチ→天引き→集計更新

Assumptions:
- target_date は Asia/Tokyo で解釈し、同日中にバッチを複数回実行しても冪等。
- 回収額計算は `C = min(gross_salary, advance_balance_at(target_date))`、手数料の追加計上はなし。
- driver_balances_materialized と metrics_monthly は毎バッチ再計算/upsert する。

```mermaid
sequenceDiagram
    participant C as Company Admin
    participant API as API/Service
    participant DB as DB/Ledger
    participant Cron as Scheduler
    participant Batch as run_daily_batch(target_date)
    participant Dash as Dashboards/Cache

    C->>API: CSV upload payrolls (payout_date, gross_salary)
    API->>DB: insert payrolls status=planned

    Cron->>Batch: trigger with target_date
    Batch->>DB: select payrolls where status=planned and payout_date<=target_date for update
    loop each payroll
        Batch->>DB: compute advance_balance(driver, company)
        Batch->>DB: collection = min(gross_salary, balance)
        Batch->>DB: insert ledger entry (collection, occurred_on=payout_date)
        Batch->>DB: update payroll (advance_collection_amount, net_salary_amount, status=processed)
    end

    Batch->>DB: recompute driver_balances_materialized as of target_date (upsert)
    Batch->>DB: recompute metrics_monthly (company + global) upsert
    Batch->>Dash: refresh payout forecasts (今月/翌月/翌々月)
    Batch-->>Cron: finished (idempotent)

    Dash-->>C: 結果確認（回収額・残高・回収率等）
```

