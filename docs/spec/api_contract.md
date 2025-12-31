# API 契約（主要ポイント）

## BigInt の string 化

- APIレスポンス内の BigInt 値は JSON では `string` として返す。
- 例: `requested_amount: "10000"`, `gross_salary_amount: "200000"`.

対象例:
- `Advance` レスポンス: `requestedAmount`, `approvedAmount`, `feeAmount`, `payoutAmount`
- `payrolls.*_amount`, `ledger_entries.amount`
- `metrics_monthly.*`, `driver_balances_materialized.*`, `billing_runs.*`

## ownership (403) の基準

- Company ロールは `company_id` が一致するリソースのみ操作可。
- Driver ロールは `driver_id` が一致するリソースのみ操作可。
- Operator/Admin は全件操作可。

## 403/404 の使い分け

- 404: 対象IDが存在しない場合。
- 403: 対象IDは存在するが、所有権が一致しない場合。

## エラー形式

- 共通: `{"error": "message", "details"?: ...}`
- 想定外エラー（500）は `requestId` を付与する: `{"error":"internal server error","requestId":"..."}`
