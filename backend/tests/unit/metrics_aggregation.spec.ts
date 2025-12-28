import { computeMonthlyMetrics } from '../../src/batch/metricsAggregation';

const start = new Date('2025-10-01T00:00:00Z');

describe('[F06][SF02] metrics aggregation', () => {
  test('aggregates ledger sums by entry type', () => {
    const grouped: Array<{ entry_type: 'advance_principal' | 'fee' | 'collection' | 'write_off'; _sum: { amount: bigint } }> = [
      { entry_type: 'advance_principal', _sum: { amount: 100_000n } },
      { entry_type: 'fee', _sum: { amount: 5_000n } },
      { entry_type: 'collection', _sum: { amount: 30_000n } },
      { entry_type: 'write_off', _sum: { amount: 10_000n } }
    ];

    const totals = computeMonthlyMetrics(grouped, start);

    expect(totals.yearMonth).toBe(start);
    expect(totals.totalAdvancePrincipal).toBe(100_000n);
    expect(totals.totalFeeRevenue).toBe(5_000n);
    expect(totals.totalCollectedPrincipal).toBe(30_000n);
    expect(totals.totalWrittenOffPrincipal).toBe(10_000n);
  });
});
