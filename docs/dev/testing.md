# テスト実行メモ

## 前提

- Docker の PostgreSQL が起動済み
- テスト用DBが作成済み（例: `driver_advance_accounting_test`）

## テスト用環境変数

`backend/.env.test` を使用する。

```bash
cat backend/.env.test
```

JWT を使うため `JWT_SECRET` の設定が必要。

## 実行

```bash
cd backend
npm install
npm run test:int
```

## 補足

- `test:int` は `prisma migrate deploy` を実行してからテストを走らせる。
- 各テスト前に全テーブルを `TRUNCATE ... CASCADE` で初期化する。

## API契約: BigInt の string 化

- APIレスポンス内の BigInt 値は JSON では `string` として返す。
- 例: `requested_amount: "10000"`, `gross_salary_amount: "200000"`.

対象例:
- `Advance` レスポンス: `requestedAmount`, `approvedAmount`, `feeAmount`, `payoutAmount`
- `payrolls.*_amount`, `ledger_entries.amount`
- `metrics_monthly.*`, `driver_balances_materialized.*`, `billing_runs.*`
