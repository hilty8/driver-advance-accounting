type GroupedEntry = {
  entry_type: 'advance_principal' | 'collection' | 'write_off' | 'fee';
  _sum: { amount: bigint | null };
};

export const computeAdvanceBalanceFromGrouped = (grouped: GroupedEntry[]): bigint => {
  let principal = 0n;
  let collected = 0n;
  let writtenOff = 0n;

  for (const row of grouped) {
    const amount = row._sum.amount ?? 0n;
    if (row.entry_type === 'advance_principal') principal += amount;
    if (row.entry_type === 'collection') collected += amount;
    if (row.entry_type === 'write_off') writtenOff += amount;
  }

  return principal - collected - writtenOff;
};
