import { ceilMulDiv, floorMulDiv } from '../../src/domain/math';

describe('[F03][SF01] math utilities', () => {
  test('ceilMulDiv rounds up for fee calculation', () => {
    const amount = 1000n;
    const rateScaled = 333n; // 0.0333
    const scale = 10000n;
    // 1000 * 0.0333 = 33.3 -> ceil = 34
    expect(ceilMulDiv(amount, rateScaled, scale)).toBe(34n);
  });

  test('floorMulDiv rounds down for limit calculation', () => {
    const amount = 1000n;
    const rateScaled = 333n; // 0.0333
    const scale = 10000n;
    // 1000 * 0.0333 = 33.3 -> floor = 33
    expect(floorMulDiv(amount, rateScaled, scale)).toBe(33n);
  });
});
