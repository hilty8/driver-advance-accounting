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
- Scenario 列は以下を併記可能（プレフィックス推奨: `(manual)` `(scenario)` `(e2e)`）
  - (manual) 手動確認シナリオ（画面操作手順）
  - (scenario) 自動シナリオ（backend/tests/scenario）
  - (e2e) Playwright E2E スモーク（e2e 配下のテストパス）

## Feature 定義（F00〜F09）

| Feature | 名称（短い） | 目的（ユーザー価値） | Spec |
| --- | --- | --- | --- |
| F00 | 基盤（共通） | 横断仕様・共通契約・共通エラー等 | `docs/spec/api_contract.md#エラー形式`, `docs/spec/api_contract.md#403404-の使い分け`, `docs/spec/api_contract.md#ownership-403-の基準` |
| F01 | ログイン/ホーム | ロール別の入口で利用開始できる | `docs/spec/features_screens.md#o-運営`, `docs/spec/features_screens.md#c-事業者`, `docs/spec/features_screens.md#d-ドライバー` |
| F02 | 招待フロー | CがDを招待し、Dが受諾できる | `docs/spec/user_flows.md#ユーザーストーリー大まかなフロー`, `docs/spec/features_screens.md#c-事業者`, `docs/spec/features_screens.md#d-ドライバー` |
| F03 | 前借り申請 | Dが前借りを申請しCが確認できる | `docs/spec/features_screens.md#d-ドライバー`, `docs/spec/features_screens.md#c-事業者` |
| F04 | 承認/否認 | Cが前借りを承認/否認できる | `docs/spec/business_logic.md#前借り承認時` |
| F05 | 支払済み反映 | Cが支払済みを反映できる | `docs/spec/business_logic.md#振込済み反映` |
| F06 | 給与確定 | 支払日バッチで給与を確定できる | `docs/spec/batch.md#日次バッチ`, `docs/spec/business_logic.md#給与支給時の回収` |
| F07 | 回収上書き/貸倒 | 例外処理で回収や貸倒を調整できる | `docs/spec/business_logic.md#給与支給時の回収`, `docs/spec/business_logic.md#貸倒` |
| F08 | CSV/請求 | CSV運用と請求料率を管理できる | `docs/spec/integrations_io.md#csv-インポート`, `docs/spec/integrations_io.md#csv-エクスポート候補`, `docs/spec/revenue_billing.md#収益請求` |
| F09 | 会社オンボーディング | Cが決済と初期設定を完了して利用開始できる | `docs/spec/openapi_min.yaml#/paths/~1onboarding~1company/post`, `docs/spec/openapi_min.yaml#/paths/~1billing~1preview/post`, `docs/spec/openapi_min.yaml#/paths/~1billing~1run/post`, `docs/spec/openapi_min.yaml#/paths/~1stripe~1customers/post`, `docs/spec/openapi_min.yaml#/paths/~1stripe~1invoices~1finalize/post`, `docs/spec/openapi_min.yaml#/paths/~1stripe~1invoices~1send/post`, `docs/spec/openapi_min.yaml#/paths/~1stripe~1webhook/post`, `docs/spec/features_screens.md#c-事業者`, `docs/spec/user_flows.md#ユーザーストーリー大まかなフロー` |
| F10 | 稼働登録 | Companyが「案件（稼働パターン）」と「稼働（実績）」を登録できる | TBD |
| F11 | Company ドライバー一覧 | Companyが自社ドライバー一覧（名前/メール）を確認できる | TBD |

| Feature | SubFeature | 名称（短い） | 目的（ユーザー価値） | Spec | Unit | Integration | Contract | Scenario | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F00 | SF01 | 共通エラー | 失敗時に共通形式で返せる | `docs/spec/api_contract.md#エラー形式`, `docs/spec/api_contract.md#403404-の使い分け`, `docs/spec/api_contract.md#ownership-403-の基準` | - | `[F00][SF01]` `backend/tests/integration/smoke.spec.ts` | - | TBD | CI |
| F00 | SF02 | 同一Company内 Driverメール重複禁止 | 誤登録や二重管理を防ぎ、招待/認可の整合を保つ | TBD | - | （担保先）[F02][SF01] `backend/tests/integration/driver_invite.spec.ts` にて重複判定（既存Driver/有効招待）を担保 | - | （担保先）F02 SF01 の Scenario を参照 | Design |
| F00 | SF03 | 監査ログ（運営） | Oが承認/否認履歴を一覧/検索できる | TBD（備考: 現時点では @@index([advance_id, created_at]) は不要。必要になったタイミングで追加する。） | TBD | TBD | TBD | `companyId での検索に対応（詳細は後続で定義）` | Design |
| F00 | SF04 | アプリ内通知（Driver） | Dが通知件数と一覧/詳細を参照できる | TBD | TBD | TBD | TBD | `通知件数→一覧→詳細の導線を想定（詳細は後続で定義）` | Design |
| F01 | SF01 | ログイン | ユーザーがJWTを取得してアプリを使える | `docs/spec/openapi_min.yaml#/paths/~1auth~1login/post`, `docs/spec/api_contract.md#エラー形式` | - | `[F01][SF01]` `backend/tests/integration/auth.spec.ts` | `[F01][SF01]` `backend/tests/contracts/contract.spec.ts` | (e2e) e2e/smoke/login_roles.spec.ts | CI |
| F01 | SF02 | ロール別ホーム | ロールに応じた初期導線を案内できる | `docs/spec/auth_routing.md#ロール別遷移ルール`, `docs/spec/auth_routing.md#未ログイン時のガード`, `docs/spec/auth_routing.md#権限不足時の扱い` | - | - | - | TBD | CI |
| F02 | SF01 | 招待作成（新規） | Cが新規にDを招待できる | `docs/spec/openapi_min.yaml#/paths/~1drivers~1{id}~1invite/post`, `docs/spec/features_screens.md#c-事業者` | - | `[F02][SF01]` `backend/tests/integration/driver_invite.spec.ts` / 同一company内の重複判定（既存Driverは409・有効招待がある場合は409） / ownershipは共通規約(403/404) | - | `/company → 招待作成 → 成功メッセージ + 招待先メール + 有効期限が表示される（内部情報は非表示） / 既存Driverのemailは409 / 有効招待があるemailは409` | CI |
| F02 | SF02 | 招待受諾 | Dが招待を受諾できる | `docs/spec/openapi_min.yaml#/paths/~1driver-invitations~1accept/post`, `docs/spec/features_screens.md#d-ドライバー` | - | `[F02][SF02]` `backend/tests/integration/driver_invite.spec.ts` | - | `/invite/accept?token=... → token自動セット → 受諾完了 → ログイン導線` | CI |
| F02 | SF03 | 招待後ログイン | Dが招待後にログインできる | `docs/spec/openapi_min.yaml#/paths/~1auth~1login/post`, `docs/spec/user_flows.md#ユーザーストーリー大まかなフロー` | - | - | - | `/login → driver@example.com でログイン → /driver へ遷移` | Design |
| F02 | SF04 | 招待再送/宛先変更 | 期限切れや誤入力に対して、Cが招待を再送できる／宛先メールを変更できる | TBD | - | TBD | - | (manual) 期限切れ招待を再送で復活（token再発行・expires延長の想定） / (manual) 宛先メールを変更して再送できる / (409) 同一company内で “有効招待（未失効＆未受諾）” が同一メールに既に存在する場合は 409 | Design |
| F03 | SF01 | 前借り申請 | Dが前借りを申請できる | `docs/spec/openapi_min.yaml#/paths/~1drivers~1{id}~1advances/post`, `docs/spec/features_screens.md#d-ドライバー` | `[F03][SF01]` `backend/tests/unit/math.spec.ts`, `backend/tests/unit/batch_math.spec.ts` | `[F03][SF01]` `backend/tests/integration/advance_lifecycle.spec.ts` | `[F03][SF01]` `backend/tests/contracts/contract.spec.ts` | (manual) /login → driverでログイン → /driver で前借り可能上限と利用中合計が円表示 → 上限超過で申請し日本語エラー → 上限内で申請し「XXX,XXX円の前借り申請を送信しました。」を確認 / (e2e) e2e/smoke/advance_apply.spec.ts | CI |
| F03 | SF02 | 申請一覧 | Cが申請一覧を確認できる | `docs/spec/openapi_min.yaml#/paths/~1companies~1{id}~1advances/get`, `docs/spec/features_screens.md#c-事業者` | - | `[F03][SF02]` `backend/tests/integration/company_advances_list.spec.ts` | `[F03][SF02]` `backend/tests/contracts/contract.spec.ts` | `/login → driverで申請（「XXX,XXX円の前借り申請を送信しました。」を確認）→ /login → companyでログイン → /company の一覧に表示（コンソール404なし）` | CI |
| F04 | SF01 | 承認 | Cが前借りを承認できる | `docs/spec/openapi_min.yaml#/paths/~1advances~1{id}~1approve/post`, `docs/spec/business_logic.md#前借り承認時` | - | `[F04][SF01]` `backend/tests/integration/advance_lifecycle.spec.ts` `requestedのみ承認可/それ以外は409` `ownershipは共通規約(403/404)` | - | (manual) /company → requested を選択 → 承認ボタン → 確認ダイアログ → 承認 → 一覧で status=承認 を確認（自社のみ/監査ログ: APPROVED） / (scenario) backend/tests/scenario/advance_approve_reject.spec.ts / (e2e) e2e/smoke/advance_approve.spec.ts | CI |
| F04 | SF02 | 否認 | Cが前借りを否認できる | `docs/spec/openapi_min.yaml#/paths/~1advances~1{id}~1reject/post`, `docs/spec/business_logic.md#前借り承認時` | - | `[F04][SF02]` `backend/tests/integration/advance_reject.spec.ts` `requestedのみ否認可/それ以外は409` `ownershipは共通規約(403/404)` `reason必須(空白NG/最大500)` | - | (manual) /company → requested を選択 → 否認ボタン → 確認ダイアログ（理由必須/空白NG/最大500）→ 否認 → 一覧で status=否認 を確認（自社のみ/監査ログ: REJECTED + reason） / (scenario) backend/tests/scenario/advance_approve_reject.spec.ts / (e2e) e2e/smoke/advance_reject.spec.ts | CI |
| F04 | SF03 | 否認理由の参照 | Dが否認理由を参照できる | `docs/spec/openapi_min.yaml#/paths/~1drivers~1{id}~1advances/get` | - | `[F04][SF03]` `backend/tests/integration/driver_advances_list.spec.ts` | - | TBD | CI |
| F05 | SF01 | 振込済み反映 | Cが振込済みを反映できる | `docs/spec/openapi_min.yaml#/paths/~1advances~1{id}~1mark-paid/post`, `docs/spec/business_logic.md#振込済み反映` | - | `[F05][SF01]` `backend/tests/integration/advance_mark_paid.spec.ts` | - | `[F05][SF01]` `backend/tests/scenario/advance_mark_paid.spec.ts` | CI |
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
| F10 | SF01 | 案件マスタ登録 | 会社が案件名と単価を登録でき、稼働入力の前提を整える | TBD | - | TBD | - | (manual) TBD | Design |
| F10 | SF02 | 稼働登録 | 案件ID + 日付 + 個数 を登録できる | TBD | - | TBD | - | (manual) TBD | Design |
| F10 | SF03 | 稼働の編集制限 | 過去分の編集可否を制御できる | TBD（備考: 稼働に確定/不確定ステータスは設けない / 編集可能期間は“直近分のみ” / 例: 4月なら2月以前は編集不可） | - | TBD | - | (manual) TBD | Design |
| F10 | SF04 | 上限計算へ稼働を反映 | 稼働登録が前借り上限に反映される | TBD（備考: 稼働登録が前借り上限（F03）に反映され、デモで一連が成立する / 前借り上限算出対象は「給与として未払いの稼働」を全て対象） | - | TBD | - | (manual) TBD | Design |
| F11 | SF01 | ドライバー一覧 | Companyが自社ドライバー（名前/メール）を確認できる | TBD | - | TBD | - | (manual) TBD | Design |

## Changelog

- 2025-12-27: Status を単一値に正規化し、F00 を新設して共通エラーを移管
- 2025-12-27: OpenAPI の Spec リンクを JSON Pointer へ精密化
- 2025-12-28: F01-SF02 をロール別ホーム実装に合わせて CI に更新
- 2025-12-30: F04 承認/否認のシナリオを更新（確認ダイアログ、否認理由必須/最大500、監査ログ要件）
- 2025-12-30: F04 に否認理由参照（Driver）を Design 追加、F00 に監査ログ（運営）/アプリ内通知（Driver）を Design 追加
- 2025-12-30: F04 SF01/SF02 の Status を Design に戻した
- 2025-12-30: F04 requested以外は409 のルールを台帳に明記
- 2025-12-30: Scenario列にPlaywright(E2E)スモーク候補を記載する運用を追加
- 2025-12-30: F04 承認/否認に API シナリオを追加し Status を CI に更新
- 2025-12-30: F05 を振込済み反映に更新し /payout-instruct を削除
- 2026-01-01: F02 を能力単位に拡張（再送/宛先変更を Design 追加）
- 2026-01-01: F00 に同一Company内 Driverメール重複禁止を Design 追加
- 2026-01-01: 台帳は画面構成ではなく能力単位で管理する方針を明記
- 2026-01-01: 台帳の整合調整（F00/F02 の担保先・備考・409条件を明文化）
- 2026-01-01: F05（Feature定義）を支払済み反映に統一し、Spec参照を #振込済み反映 に合わせた
- 2026-01-01: F10（稼働登録）/F11（Companyドライバー一覧）を台帳に追加（Design）
- 2026-01-01: F10/F11 のテスト列表記（- / TBD）を整形し、F10 SF03/SF04 の長文を Spec備考へ移動
