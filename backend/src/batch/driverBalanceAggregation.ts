import { DriverBalanceMaterialized } from '../domain/types';
import { calculateAdvanceLimit } from './batchMath';

type DriverRow = {
  id: string;
  companyId: string;
};

type LedgerSums = {
  advance_principal: bigint;
  collection: bigint;
  write_off: bigint;
};

export const computeDriverBalancesFromAggregates = (
  drivers: DriverRow[],
  earningsByDriver: Map<string, bigint>,
  currentMonthEarningsByDriver: Map<string, bigint>,
  ledgerByDriver: Map<string, LedgerSums>,
  limitRatesByCompany: Map<string, bigint>,
  allowOverSalaryByCompany: Map<string, boolean>,
  asOfDate: Date
): DriverBalanceMaterialized[] => {
  const balances: DriverBalanceMaterialized[] = [];
  const scale = 10000n;

  for (const driver of drivers) {
    const unpaidConfirmed = earningsByDriver.get(driver.id) ?? 0n;
    const currentMonthConfirmed = currentMonthEarningsByDriver.get(driver.id) ?? 0n;
    const ledger = ledgerByDriver.get(driver.id) ?? { advance_principal: 0n, collection: 0n, write_off: 0n };
    const advanceBalance = ledger.advance_principal - ledger.collection - ledger.write_off;
    const limitRateScaled = limitRatesByCompany.get(driver.companyId) ?? 0n;
    const advanceLimit = calculateAdvanceLimit(unpaidConfirmed, advanceBalance, limitRateScaled, scale);
    const allowOverSalary = allowOverSalaryByCompany.get(driver.companyId) ?? false;
    const salaryCap = currentMonthConfirmed - advanceBalance;
    const effectiveCap = salaryCap > 0n ? salaryCap : 0n;
    const finalLimit = allowOverSalary ? advanceLimit : (advanceLimit < effectiveCap ? advanceLimit : effectiveCap);

    balances.push({
      driverId: driver.id,
      companyId: driver.companyId,
      advanceBalance,
      unpaidConfirmedEarnings: unpaidConfirmed,
      advanceLimit: finalLimit,
      asOfDate,
      refreshedAt: new Date()
    });
  }

  return balances;
};
