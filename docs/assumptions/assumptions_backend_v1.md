# Backend Assumptions (v1)

- BigInt を扱うため、DB では BIGINT、アプリでは `bigint` 型を使用し、外部 I/O（API/CSV）は文字列で受け渡す想定。
- Prisma/TypeScript の型は基本的に snake_case カラムを camelCase にマッピングする変換層を後で整備する（現状は簡易マッピング）。
- `runDailyBatch` のロック戦略は、Prisma のトランザクション + `for update` 相当で実装予定（具体的な実装は環境準拠で後決定）。
- driver_balances_materialized と metrics_monthly の再計算ロジックは、バッチ側で SQL 集計を直接書くか、一時テーブルを用いるかは未決定。
- テスト用の DB 接続はローカル PostgreSQL/SQLite (pg-compatible) いずれかを選定予定。現状は pg 前提。
- fee/limit の丸めはアプリ層で実装し、DB には丸め済みの整数を保存する方針。

