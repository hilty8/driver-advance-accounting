import { calculateBillingFee, resolveBillingRateScaled } from '../../src/domain/billingTier';

describe('[F08][SF03] billing tier', () => {
  it('applies correct rate by principal', () => {
    expect(resolveBillingRateScaled(999_999n)).toBe(500n);
    expect(resolveBillingRateScaled(1_000_000n)).toBe(400n);
    expect(resolveBillingRateScaled(2_000_000n)).toBe(300n);
    expect(resolveBillingRateScaled(5_000_000n)).toBe(200n);
  });

  it('calculates fee with ceiling', () => {
    const fee = calculateBillingFee(1_000_001n);
    expect(fee).toBeGreaterThan(40_000n);
  });
});
