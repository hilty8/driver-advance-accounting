import { computeAdvanceBalanceFromGrouped } from '../../src/repositories/prisma/ledgerAggregation';

describe('[F06][SF02] ledger aggregation', () => {
  test('computes balance from grouped sums', () => {
    const grouped: Array<{ entry_type: 'advance_principal' | 'collection' | 'write_off' | 'fee'; _sum: { amount: bigint } }> = [
      { entry_type: 'advance_principal', _sum: { amount: 100_000n } },
      { entry_type: 'collection', _sum: { amount: 30_000n } },
      { entry_type: 'write_off', _sum: { amount: 10_000n } },
      { entry_type: 'fee', _sum: { amount: 5_000n } }
    ];

    expect(computeAdvanceBalanceFromGrouped(grouped)).toBe(60_000n);
  });

  test('handles missing entry types', () => {
    const grouped: Array<{ entry_type: 'advance_principal'; _sum: { amount: bigint } }> = [
      { entry_type: 'advance_principal', _sum: { amount: 50_000n } }
    ];

    expect(computeAdvanceBalanceFromGrouped(grouped)).toBe(50_000n);
  });
});
