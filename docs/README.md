# 仕様書インデックス

## 目的

- 本仕様書群は Driver Advance Accounting の要件を情報種別ごとに整理する。
- 実装詳細は別途設計書にて定義する。

## 仕様本文（読み順）

- `docs/spec/README.md`: 仕様本文の並び順
- `docs/spec/background_scope.md`: 背景・目的・スコープ
- `docs/spec/glossary.md`: 用語集
- `docs/spec/nonfunctional.md`: 非機能要件
- `docs/spec/domain_rules.md`: ドメインルール（丸め/上限/ステータス/整合性）
- `docs/spec/business_logic.md`: 主要ロジック（承認/回収/貸倒）
- `docs/spec/batch.md`: 日次バッチ
- `docs/spec/revenue_billing.md`: 収益/請求
- `docs/spec/features_screens.md`: 画面/機能概要（O/C/D）
- `docs/spec/user_flows.md`: ユーザーストーリー
- `docs/spec/auth_routing.md`: 認証/遷移ルール
- `docs/spec/integrations_io.md`: 外部連携/入出力（CSV/メール/Stripe）
- `docs/spec/data_model.md`: データモデル概要
- `docs/spec/api_overview.md`: API 概要（参考）
- `docs/spec/tests.md`: テスト方針
- `docs/spec/open_issues.md`: 要検討事項
- `docs/spec/notifications.md`: 通知仕様
- `docs/spec/billing_operations.md`: 請求運用
- `docs/spec/api_missing.md`: 未実装API設計

## 補助資料

- `docs/diagrams/advances_state_diagram.md`
- `docs/diagrams/payrolls_state_diagram.md`
- `docs/diagrams/sequence_advance_request_flow.md`
- `docs/diagrams/sequence_payroll_batch_flow.md`
- `docs/diagrams/driver_advance_accounting_erd.md`
- `docs/tests/batch_idempotency_test_cases.md`
- `docs/assumptions/assumptions_backend_v1.md`
- `docs/test-catalog.md`

## 開発者メモ

- `docs/dev/local-db-docker.md`
- `docs/dev/local-server.md`
- `docs/dev/local-frontend.md`
- `docs/dev/testing.md`

## Railwayデプロイ（Docker）

- サービスは backend/frontend を分離し、それぞれの Dockerfile を指定する（`backend/Dockerfile`, `frontend/Dockerfile`）。
- Prisma のマイグレーションは Railway の Release Command で `npx prisma migrate deploy` を実行する想定。

## テスト実行（Docker Postgres前提）

1. テスト用DBを作成（例: `driver_advance_accounting_test`）
2. `backend/.env.test` を用意して `DATABASE_URL` を設定
3. 以下を実行

```bash
cd backend
npm install
npm run test:int
```

補足: テスト実行時に `prisma migrate deploy` を走らせ、各テストでテーブルをTRUNCATEします。
