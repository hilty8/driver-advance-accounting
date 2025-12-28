# 結合/統合テスト（Integration）

## 目的

- API を HTTP 経由で検証し、`docs/test-catalog.md` の Feature/SF を担保する。

## catalog に紐づく integration テスト

| Feature/SF | 目的（要約） | テスト（タグ/ファイル） |
| --- | --- | --- |
| F01/SF01 | ログインの成功/失敗 | `[F01][SF01]` `backend/tests/integration/auth.spec.ts` |
| F09/SF01 | 会社オンボーディング | `[F09][SF01]` `backend/tests/integration/onboarding.spec.ts` |
| F00/SF01 | 共通エラー形式 | `[F00][SF01]` `backend/tests/integration/smoke.spec.ts` |
| F02/SF01 | 招待送信/受諾 | `[F02][SF01]` `backend/tests/integration/driver_invite.spec.ts` |
| F03/SF01 | 前借り申請 | `[F03][SF01]` `backend/tests/integration/advance_lifecycle.spec.ts` |
| F04/SF01 | 前借り承認 | `[F04][SF01]` `backend/tests/integration/advance_lifecycle.spec.ts` |
| F04/SF02 | 前借り否認 | `[F04][SF02]` `backend/tests/integration/advance_reject.spec.ts` |
| F05/SF01 | 支払指示/支払済 | `[F05][SF01]` `backend/tests/integration/advance_lifecycle.spec.ts` |
| F06/SF01 | 支払日決定 | `[F06][SF01]` `backend/tests/integration/payroll_payout_date.spec.ts` |
| F06/SF02 | 給与確定 | `[F06][SF02]` `backend/tests/integration/payroll_batch.spec.ts` |
| F07/SF01 | 回収上書き | `[F07][SF01]` `backend/tests/integration/payroll_override.spec.ts` |
| F07/SF02 | 貸倒処理 | `[F07][SF02]` `backend/tests/integration/advance_writeoff.spec.ts` |
