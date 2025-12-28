import { computePayoutDate, monthStart } from '../../src/domain/dates';

const isBusinessDay = (date: Date) => {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
};

describe('[F06][SF01] computePayoutDate', () => {
  it('uses payout day when set', () => {
    const payoutMonth = monthStart(new Date(Date.UTC(2025, 0, 1)));
    const payoutDate = computePayoutDate(payoutMonth, 25, false, isBusinessDay);
    expect(payoutDate?.toISOString().slice(0, 10)).toBe('2025-01-24');
  });

  it('adjusts month-end to previous business day', () => {
    const payoutMonth = monthStart(new Date(Date.UTC(2024, 5, 1))); // 2024-06
    const payoutDate = computePayoutDate(payoutMonth, null, true, isBusinessDay);
    expect(payoutDate?.toISOString().slice(0, 10)).toBe('2024-06-28');
  });
});
