import { computeDriverBalancesFromAggregates } from '../../src/batch/driverBalanceAggregation';
import { DriverBalanceMaterialized } from '../../src/domain/types';

const asOfDate = new Date('2025-10-31T00:00:00Z');

describe('[F06][SF02] driver balance aggregation', () => {
  test('computes balances and limits from aggregates', () => {
    const drivers = [
      { id: 'd1', companyId: 'c1' },
      { id: 'd2', companyId: 'c1' }
    ];

    const earningsByDriver = new Map([
      ['d1', 100_000n],
      ['d2', 50_000n]
    ]);

    const ledgerByDriver = new Map([
      ['d1', { advance_principal: 80_000n, collection: 30_000n, write_off: 0n }],
      ['d2', { advance_principal: 20_000n, collection: 0n, write_off: 0n }]
    ]);

    const limitRatesByCompany = new Map([
      ['c1', 8000n]
    ]);

    const currentMonthByDriver = new Map([
      ['d1', 80_000n],
      ['d2', 40_000n]
    ]);
    const allowOverSalaryByCompany = new Map([
      ['c1', true]
    ]);

    const balances = computeDriverBalancesFromAggregates(
      drivers,
      earningsByDriver,
      currentMonthByDriver,
      ledgerByDriver,
      limitRatesByCompany,
      allowOverSalaryByCompany,
      asOfDate
    );

    const byDriver = new Map(balances.map((b) => [b.driverId, b]));

    const d1 = byDriver.get('d1') as DriverBalanceMaterialized;
    expect(d1.advanceBalance.toString()).toBe('50000');
    expect(d1.unpaidConfirmedEarnings.toString()).toBe('100000');
    expect(d1.advanceLimit.toString()).toBe('30000');

    const d2 = byDriver.get('d2') as DriverBalanceMaterialized;
    expect(d2.advanceBalance.toString()).toBe('20000');
    expect(d2.unpaidConfirmedEarnings.toString()).toBe('50000');
    expect(d2.advanceLimit.toString()).toBe('20000');
  });
});
