export const decimalToScaledBigInt = (value: string, scale: number): bigint => {
  const [intPart, fracPartRaw] = value.split('.');
  const fracPart = (fracPartRaw ?? '').padEnd(scale, '0').slice(0, scale);
  const normalized = `${intPart ?? '0'}${fracPart}`;
  return BigInt(normalized);
};

export const ceilMulDiv = (amount: bigint, rateScaled: bigint, scale: bigint): bigint => {
  if (amount === 0n || rateScaled === 0n) return 0n;
  return (amount * rateScaled + (scale - 1n)) / scale;
};

export const floorMulDiv = (amount: bigint, rateScaled: bigint, scale: bigint): bigint => {
  if (amount === 0n || rateScaled === 0n) return 0n;
  return (amount * rateScaled) / scale;
};
