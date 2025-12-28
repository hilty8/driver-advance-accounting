# シナリオテスト（E2E）

## 目的

- `docs/test-catalog.md` の Feature/SF に対する主要導線を 1 本ずつ担保する。

## catalog に紐づく想定シナリオ（TBD）

| Feature/SF | 目的（要約） | 想定シナリオ | テストタグ（予定） |
| --- | --- | --- | --- |
| F03/SF01 + F04/SF01 + F05/SF01 | 申請→承認→支払済まで完走 | D申請→C承認→支払済反映 | `@F03 @SF01 @F04 @SF01 @F05 @SF01` |
| F06/SF02 | 支払日バッチで給与確定 | 1月分→支払日バッチ→回収反映 | `@F06 @SF02` |
| F07/SF02 | 貸倒処理の影響 | write_off→残高/メトリクス更新 | `@F07 @SF02` |
| F08/SF01 | CSVインポート | 取込→バリデーション→登録 | `@F08 @SF01` |

## メモ

- 既存の雛形: `backend/tests/scenario/daily_batch_idempotency.spec.ts` （`[F06][SF02]`）
- 実行は `runDailyBatch(target_date)` を日付を変えて複数回実行する想定。
