import { runDailyBatch } from '../../src/batch/runDailyBatch';

describe('[F06][SF02] runDailyBatch idempotency', () => {
  test('同じ target_date で複数回実行しても ledger_entries が二重計上されない', async () => {
    // TODO: seed advances/payrolls/ledger with fixtures
    // await runDailyBatch(new Date('2025-10-31'));
    // await runDailyBatch(new Date('2025-10-31'));
    // TODO: expect ledger entries count/amount stable
  });

  test('driver_balances_materialized が再計算で安定する', async () => {
    // TODO: run twice and assert balances unchanged
  });

  test('metrics_monthly が二重計上されない', async () => {
    // TODO: run twice and assert metrics totals once
  });
});
