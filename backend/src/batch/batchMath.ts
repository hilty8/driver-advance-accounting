import { ceilMulDiv, floorMulDiv } from '../domain/math';

export const calculateCollection = (grossSalary: bigint, advanceBalance: bigint): bigint => {
  return grossSalary < advanceBalance ? grossSalary : advanceBalance;
};

export const calculateAdvanceLimit = (
  unpaidConfirmed: bigint,
  advanceBalance: bigint,
  limitRateScaled: bigint,
  scale: bigint
): bigint => {
  const limit = floorMulDiv(unpaidConfirmed, limitRateScaled, scale);
  const available = limit - advanceBalance;
  return available > 0n ? available : 0n;
};

export const calculateFee = (principal: bigint, feeRateScaled: bigint, scale: bigint): bigint => {
  return ceilMulDiv(principal, feeRateScaled, scale);
};
