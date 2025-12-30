import { Decimal } from '@prisma/client/runtime/library';
import { decimalToScaledBigInt } from './math';
import { calculateAdvanceLimit } from '../batch/batchMath';

export const RATE_SCALE = 10000n;

export const decimalToRateScaled = (value: Decimal | number | string): bigint => {
  if (typeof value === 'number') return BigInt(Math.round(value * Number(RATE_SCALE)));
  if (typeof value === 'string') return decimalToScaledBigInt(value, 4);
  return decimalToScaledBigInt(value.toString(), 4);
};

export const computeAvailableAdvance = ({
  unpaidConfirmed,
  advanceBalance,
  limitRateScaled,
  allowAdvanceOverSalary,
  currentMonthConfirmed,
  scale = RATE_SCALE
}: {
  unpaidConfirmed: bigint;
  advanceBalance: bigint;
  limitRateScaled: bigint;
  allowAdvanceOverSalary: boolean;
  currentMonthConfirmed: bigint;
  scale?: bigint;
}) => {
  const baseLimit = calculateAdvanceLimit(unpaidConfirmed, advanceBalance, limitRateScaled, scale);
  if (allowAdvanceOverSalary) return baseLimit;

  const cap = currentMonthConfirmed - advanceBalance;
  const effectiveCap = cap > 0n ? cap : 0n;
  return baseLimit < effectiveCap ? baseLimit : effectiveCap;
};
