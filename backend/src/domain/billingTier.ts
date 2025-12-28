import { ceilMulDiv } from './math';

const RATE_SCALE = 10000n;

export const resolveBillingRateScaled = (principal: bigint): bigint => {
  if (principal < 1_000_000n) return 500n;   // 5.00%
  if (principal < 2_000_000n) return 400n;   // 4.00%
  if (principal < 5_000_000n) return 300n;   // 3.00%
  return 200n;                               // 2.00%
};

export const calculateBillingFee = (principal: bigint): bigint => {
  const rate = resolveBillingRateScaled(principal);
  return ceilMulDiv(principal, rate, RATE_SCALE);
};
