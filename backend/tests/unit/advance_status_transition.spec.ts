import { determineAdvanceStatusUpdate } from '../../src/batch/advanceStatusTransition';

describe('[F06][SF02] advance status transition', () => {
  test('marks settling when collection happens and balance remains', () => {
    expect(determineAdvanceStatusUpdate(10_000n, 5_000n)).toBe('settling');
  });

  test('marks settled when balance is zero', () => {
    expect(determineAdvanceStatusUpdate(0n, 0n)).toBe('settled');
    expect(determineAdvanceStatusUpdate(0n, 5_000n)).toBe('settled');
  });

  test('no change when no collection and balance remains', () => {
    expect(determineAdvanceStatusUpdate(10_000n, 0n)).toBeNull();
  });
});
