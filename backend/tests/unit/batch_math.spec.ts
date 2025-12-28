import { calculateAdvanceLimit, calculateCollection, calculateFee } from '../../src/batch/batchMath';

describe('[F03][SF01][F06][SF02] batch math helpers', () => {
  test('calculateCollection uses min(gross, balance)', () => {
    expect(calculateCollection(50_000n, 80_000n)).toBe(50_000n);
    expect(calculateCollection(80_000n, 50_000n)).toBe(50_000n);
    expect(calculateCollection(0n, 10_000n)).toBe(0n);
  });

  test('calculateAdvanceLimit floors and never returns negative', () => {
    const rateScaled = 8000n;
    const scale = 10000n;
    expect(calculateAdvanceLimit(100_000n, 30_000n, rateScaled, scale)).toBe(50_000n);
    expect(calculateAdvanceLimit(10_000n, 20_000n, rateScaled, scale)).toBe(0n);
  });

  test('calculateFee uses ceil for fee', () => {
    const rateScaled = 333n;
    const scale = 10000n;
    expect(calculateFee(1000n, rateScaled, scale)).toBe(34n);
  });
});
