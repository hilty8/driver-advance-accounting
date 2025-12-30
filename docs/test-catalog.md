# Test Catalog

目的: 機能/サブ機能とテスト（unit/integration/scenario/contract）を紐づけて可視化する。

## 実行コマンド

- backend unit: `cd backend && npm run test:unit`
- backend int : `cd backend && npm run test:int`
- frontend: `cd frontend && npm run generate:openapi && npm run build`

## タグ規約

- Jest の `describe` / `test` 名に `[Fxx][SFxx]` を含める
- 例: `describe('[F03][SF01] advance apply ...', () => { ... })`
- 今後追加するテストは原則 `backend/tests/{unit|integration|contracts|scenario}` に置く（`backend/src/__tests__` は移行対象）

## 凡例

- `Status`: Design / Implemented / CI
- `Spec` と `Tests` はリンクやタグ/ファイルパスで記載

## Feature 定義（F00〜F09）

| Feature | 名称（短い） | 目的（ユーザー価値） | Spec |
| --- | --- | --- | --- |
| F00 | 基盤（共通） | 横断仕様・共通契約・共通エラー等 | `docs/spec/api_contract.md#エラー形式`, `docs/spec/api_contract.md#403404-の使い分け`, `docs/spec/api_contract.md#ownership-403-の基準` |
| F01 | ログイン/ホーム | ロール別の入口で利用開始できる | `docs/spec/features_screens.md#o-運営`, `docs/spec/features_screens.md#c-事業者`, `docs/spec/features_screens.md#d-ドライバー` |
| F02 | 招待フロー | CがDを招待し、Dが受諾できる | `docs/spec/user_flows.md#ユーザーストーリー大まかなフロー`, `docs/spec/features_screens.md#c-事業者`, `docs/spec/features_screens.md#d-ドライバー` |
| F03 | 前借り申請 | Dが前借りを申請しCが確認できる | `docs/spec/features_screens.md#d-ドライバー`, `docs/spec/features_screens.md#c-事業者` |
| F04 | 承認/否認 | Cが前借りを承認/否認できる | `docs/spec/business_logic.md#前借り承認時` |
| F05 | 支払指示/支払済 | Cが支払指示し反映できる | `docs/spec/business_logic.md#振込指示完了` |
| F06 | 給与確定 | 支払日バッチで給与を確定できる | `docs/spec/batch.md#日次バッチ`, `docs/spec/business_logic.md#給与支給時の回収` |
| F07 | 回収上書き/貸倒 | 例外処理で回収や貸倒を調整できる | `docs/spec/business_logic.md#給与支給時の回収`, `docs/spec/business_logic.md#貸倒` |
| F08 | CSV/請求 | CSV運用と請求料率を管理できる | `docs/spec/integrations_io.md#csv-インポート`, `docs/spec/integrations_io.md#csv-エクスポート候補`, `docs/spec/revenue_billing.md#収益請求` |
| F09 | 会社オンボーディング | Cが決済と初期設定を完了して利用開始できる | `docs/spec/openapi_min.yaml#/paths/~1onboarding~1company/post`, `docs/spec/openapi_min.yaml#/paths/~1billing~1preview/post`, `docs/spec/openapi_min.yaml#/paths/~1billing~1run/post`, `docs/spec/openapi_min.yaml#/paths/~1stripe~1customers/post`, `docs/spec/openapi_min.yaml#/paths/~1stripe~1invoices~1finalize/post`, `docs/spec/openapi_min.yaml#/paths/~1stripe~1invoices~1send/post`, `docs/spec/openapi_min.yaml#/paths/~1stripe~1webhook/post`, `docs/spec/features_screens.md#c-事業者`, `docs/spec/user_flows.md#ユーザーストーリー大まかなフロー` |

| Feature | SubFeature | 名称（短い） | 目的（ユーザー価値） | Spec | Unit | Integration | Contract | Scenario | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F00 | SF01 | 共通エラー | 失敗時に共通形式で返せる | `docs/spec/api_contract.md#エラー形式`, `docs/spec/api_contract.md#403404-の使い分け`, `docs/spec/api_contract.md#ownership-403-の基準` | - | `[F00][SF01]` `backend/tests/integration/smoke.spec.ts` | - | TBD | CI |
| F01 | SF01 | ログイン | ユーザーがJWTを取得してアプリを使える | `docs/spec/openapi_min.yaml#/paths/~1auth~1login/post`, `docs/spec/api_contract.md#エラー形式` | - | `[F01][SF01]` `backend/tests/integration/auth.spec.ts` | `[F01][SF01]` `backend/tests/contracts/contract.spec.ts` | TBD | CI |
| F01 | SF02 | ロール別ホーム | ロールに応じた初期導線を案内できる | `docs/spec/auth_routing.md#ロール別遷移ルール`, `docs/spec/auth_routing.md#未ログイン時のガード`, `docs/spec/auth_routing.md#権限不足時の扱い` | - | - | - | TBD | CI |
| F02 | SF01 | 招待送信 | CがDを招待できる | `docs/spec/openapi_min.yaml#/paths/~1drivers~1{id}~1invite/post`, `docs/spec/features_screens.md#c-事業者` | - | `[F02][SF01]` `backend/tests/integration/driver_invite.spec.ts` | - | `/company → 招待作成 → 成功メッセージ + 招待先メール + 有効期限が表示される（内部情報は非表示）` | CI |
| F02 | SF02 | 招待受諾 | Dが招待を受諾できる | `docs/spec/openapi_min.yaml#/paths/~1driver-invitations~1accept/post`, `docs/spec/features_screens.md#d-ドライバー` | - | `[F02][SF02]` `backend/tests/integration/driver_invite.spec.ts` | - | `/invite/accept?token=... → token自動セット → 受諾完了 → ログイン導線` | CI |
| F02 | SF03 | 招待後ログイン | Dが招待後にログインできる | `docs/spec/openapi_min.yaml#/paths/~1auth~1login/post`, `docs/spec/user_flows.md#ユーザーストーリー大まかなフロー` | - | - | - | `/login → driver@example.com でログイン → /driver へ遷移` | Design |
| F03 | SF01 | 前借り申請 | Dが前借りを申請できる | `docs/spec/openapi_min.yaml#/paths/~1drivers~1{id}~1advances/post`, `docs/spec/features_screens.md#d-ドライバー` | `[F03][SF01]` `backend/tests/unit/math.spec.ts`, `backend/tests/unit/batch_math.spec.ts` | `[F03][SF01]` `backend/tests/integration/advance_lifecycle.spec.ts` | `[F03][SF01]` `backend/tests/contracts/contract.spec.ts` | `/login → driverでログイン → /driver で申請 → 成功メッセージを確認` | CI |
| F03 | SF02 | 申請一覧 | Cが申請一覧を確認できる | `docs/spec/openapi_min.yaml#/paths/~1companies~1{id}~1advances/get`, `docs/spec/features_screens.md#c-事業者` | - | `[F03][SF02]` `backend/tests/integration/company_advances_list.spec.ts` | `[F03][SF02]` `backend/tests/contracts/contract.spec.ts` | `/login → driverで申請（「XXX,XXX円の前借り申請を送信しました。」を確認）→ /login → companyでログイン → /company の一覧に表示（コンソール404なし）` | CI |
| F04 | SF01 | 承認 | Cが前借りを承認できる | `docs/spec/openapi_min.yaml#/paths/~1advances~1{id}~1approve/post`, `docs/spec/business_logic.md#前借り承認時` | - | `[F04][SF01]` `backend/tests/integration/advance_lifecycle.spec.ts` | - | TBD | CI |
| F04 | SF02 | 否認 | Cが前借りを否認できる | `docs/spec/openapi_min.yaml#/paths/~1advances~1{id}~1reject/post`, `docs/spec/business_logic.md#前借り承認時` | - | `[F04][SF02]` `backend/tests/integration/advance_reject.spec.ts` | - | TBD | CI |
| F05 | SF01 | 支払指示/支払済 | Cが支払指示し結果を反映できる | `docs/spec/openapi_min.yaml#/paths/~1advances~1{id}~1payout-instruct/post`, `docs/spec/openapi_min.yaml#/paths/~1advances~1{id}~1mark-paid/post`, `docs/spec/business_logic.md#振込指示完了` | - | `[F05][SF01]` `backend/tests/integration/advance_lifecycle.spec.ts` | - | TBD | CI |
| F06 | SF01 | 支払日決定 | 支払日を自動計算できる | `docs/spec/batch.md#日次バッチ` | `[F06][SF01]` `backend/tests/unit/dates.spec.ts` | `[F06][SF01]` `backend/tests/integration/payroll_payout_date.spec.ts` | - | TBD | CI |
| F06 | SF02 | 給与確定 | 支払日バッチで給与を確定できる | `docs/spec/batch.md#日次バッチ`, `docs/spec/business_logic.md#給与支給時の回収` | `[F06][SF02]` `backend/tests/unit/advance_status_transition.spec.ts`, `backend/tests/unit/batch_collection.spec.ts`, `backend/tests/unit/batch_math.spec.ts`, `backend/tests/unit/daily_batch_handler.spec.ts`, `backend/tests/unit/ledger_aggregation.spec.ts`, `backend/tests/unit/driver_balance_aggregation.spec.ts`, `backend/tests/unit/metrics_aggregation.spec.ts` | `[F06][SF02]` `backend/tests/integration/payroll_batch.spec.ts` | - | `[F06][SF02]` `backend/tests/scenario/daily_batch_idempotency.spec.ts` | CI |
| F07 | SF01 | 回収上書き | 例外的に回収額を上書きできる | `docs/spec/openapi_min.yaml#/paths/~1payrolls~1{id}~1collection-override/post`, `docs/spec/business_logic.md#給与支給時の回収` | - | `[F07][SF01]` `backend/tests/integration/payroll_override.spec.ts` | - | TBD | CI |
| F07 | SF02 | 貸倒処理 | 前借りを貸倒計上できる | `docs/spec/openapi_min.yaml#/paths/~1advances~1{id}~1write-off/post`, `docs/spec/business_logic.md#貸倒` | - | `[F07][SF02]` `backend/tests/integration/advance_writeoff.spec.ts` | - | TBD | CI |
| F08 | SF01 | CSVインポート | CSVでデータを取り込める | `docs/spec/integrations_io.md#csv-インポート` | - | - | - | TBD | Design |
| F08 | SF02 | CSVエクスポート | CSVでデータを出力できる | `docs/spec/integrations_io.md#csv-エクスポート候補` | - | - | - | TBD | Design |
| F08 | SF03 | 請求料率 | 料率計算が正しく行える | `docs/spec/revenue_billing.md#収益請求` | `[F08][SF03]` `backend/tests/unit/billingTier.spec.ts` | - | - | TBD | CI |
| F09 | SF01 | 会社オンボーディング | Cが初期設定を開始できる | `docs/spec/openapi_min.yaml#/paths/~1onboarding~1company/post`, `docs/spec/features_screens.md#c-事業者` | `[F09][SF01]` `backend/tests/unit/company_settings.spec.ts`, `backend/tests/unit/company_settings_handler.spec.ts`, `backend/tests/unit/company_settings_handler_validation.spec.ts` | `[F09][SF01]` `backend/tests/integration/onboarding.spec.ts` | - | TBD | CI |
| F09 | SF02 | Stripe 請求準備 | Stripe 顧客/請求レコードを作成できる | `docs/spec/openapi_min.yaml#/paths/~1stripe~1customers/post`, `docs/spec/openapi_min.yaml#/paths/~1billing~1preview/post`, `docs/spec/openapi_min.yaml#/paths/~1billing~1run/post` | - | - | - | TBD | Design |
| F09 | SF03 | Stripe 請求確定 | Stripe 請求を確定できる | `docs/spec/openapi_min.yaml#/paths/~1stripe~1invoices~1finalize/post`, `docs/spec/openapi_min.yaml#/paths/~1stripe~1invoices~1send/post` | - | - | - | TBD | Design |
| F09 | SF04 | Stripe Webhook 反映 | Webhook で請求結果を反映できる | `docs/spec/openapi_min.yaml#/paths/~1stripe~1webhook/post` | - | - | - | TBD | Design |

## Changelog

- 2025-12-27: Status を単一値に正規化し、F00 を新設して共通エラーを移管
- 2025-12-27: OpenAPI の Spec リンクを JSON Pointer へ精密化
- 2025-12-28: F01-SF02 をロール別ホーム実装に合わせて CI に更新
