describe('[F06][SF02] Batch collection logic', () => {
  test('給与 < 残高 の回収ロジックを適用する', () => {
    // TODO: setup stub balance/reservoir, assert collection = gross_salary
  });

  test('給与 = 残高 の回収ロジックを適用する', () => {
    // TODO: assert collection equals balance, remaining 0
  });

  test('給与 > 残高 の回収ロジックを適用する', () => {
    // TODO: assert collection limited to balance, net salary positive
  });
});
