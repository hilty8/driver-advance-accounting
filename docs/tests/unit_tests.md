# 単体テスト（Unit）

## 目的

- `docs/test-catalog.md` の Feature/SF に紐づく最小ルールを担保する。

## catalog に紐づく unit テスト

| Feature/SF | 目的（要約） | テスト（タグ/ファイル） |
| --- | --- | --- |
| F09/SF01 | 会社設定の入力/更新 | `[F09][SF01]` `backend/tests/unit/company_settings.spec.ts`, `backend/tests/unit/company_settings_handler.spec.ts`, `backend/tests/unit/company_settings_handler_validation.spec.ts` |
| F03/SF01 | 申請/上限計算の丸め | `[F03][SF01]` `backend/tests/unit/math.spec.ts`, `backend/tests/unit/batch_math.spec.ts` |
| F06/SF01 | 支払日決定の計算 | `[F06][SF01]` `backend/tests/unit/dates.spec.ts` |
| F06/SF02 | 給与確定の集計/遷移 | `[F06][SF02]` `backend/tests/unit/advance_status_transition.spec.ts`, `backend/tests/unit/batch_collection.spec.ts`, `backend/tests/unit/batch_math.spec.ts`, `backend/tests/unit/daily_batch_handler.spec.ts`, `backend/tests/unit/ledger_aggregation.spec.ts`, `backend/tests/unit/driver_balance_aggregation.spec.ts`, `backend/tests/unit/metrics_aggregation.spec.ts` |
| F08/SF03 | 請求料率の境界値 | `[F08][SF03]` `backend/tests/unit/billingTier.spec.ts` |
