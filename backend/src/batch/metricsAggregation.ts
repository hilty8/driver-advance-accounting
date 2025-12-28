import { MetricsMonthly } from '../domain/types';
import { newUuid } from '../domain/ids';

type GroupedEntry = {
  entry_type: 'advance_principal' | 'fee' | 'collection' | 'write_off';
  _sum: { amount: bigint | null };
};

export const computeMonthlyMetrics = (
  grouped: GroupedEntry[],
  yearMonth: Date,
  companyId?: string
): MetricsMonthly => {
  let advancePrincipal = 0n;
  let fee = 0n;
  let collection = 0n;
  let writeOff = 0n;

  for (const row of grouped) {
    const amount = row._sum.amount ?? 0n;
    if (row.entry_type === 'advance_principal') advancePrincipal += amount;
    if (row.entry_type === 'fee') fee += amount;
    if (row.entry_type === 'collection') collection += amount;
    if (row.entry_type === 'write_off') writeOff += amount;
  }

  return {
    id: newUuid(),
    companyId,
    yearMonth,
    totalAdvancePrincipal: advancePrincipal,
    totalFeeRevenue: fee,
    totalCollectedPrincipal: collection,
    totalWrittenOffPrincipal: writeOff,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};
