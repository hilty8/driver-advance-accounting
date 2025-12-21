# 仕様書インデックス

## 目的

- 本仕様書群は Driver Advance Accounting の要件を情報種別ごとに整理する。
- 実装詳細は別途設計書にて定義する。

## 構成

- `docs/spec/spec_background_scope.md`: 背景・目的・スコープ
- `docs/spec/spec_glossary.md`: 用語集
- `docs/spec/spec_nonfunctional.md`: 非機能要件
- `docs/spec/spec_domain_rules.md`: ドメインルール（丸め/上限/ステータス/整合性）
- `docs/spec/spec_business_logic.md`: 主要ロジック（承認/回収/貸倒）
- `docs/spec/spec_batch.md`: 日次バッチ
- `docs/spec/spec_revenue_billing.md`: 収益/請求
- `docs/spec/spec_features_screens.md`: 画面/機能概要（O/C/D）
- `docs/spec/spec_user_flows.md`: ユーザーストーリー
- `docs/spec/spec_integrations_io.md`: 外部連携/入出力（CSV/メール/Stripe）
- `docs/spec/spec_data_model.md`: データモデル概要
- `docs/spec/spec_api_overview.md`: API 概要（参考）
- `docs/spec/spec_tests.md`: テスト方針
- `docs/spec/spec_open_issues.md`: 要検討事項

## 参考図

- `docs/diagrams/advances_state_diagram.md`
- `docs/diagrams/payrolls_state_diagram.md`
- `docs/diagrams/sequence_advance_request_flow.md`
- `docs/diagrams/sequence_payroll_batch_flow.md`
- `docs/diagrams/driver_advance_accounting_erd.md`
- `docs/tests/batch_idempotency_test_cases.md`
- `docs/assumptions/assumptions_backend_v1.md`
