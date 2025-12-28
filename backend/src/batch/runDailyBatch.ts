import { prisma } from '../repositories/prisma/client';
import { PrismaLedgerRepository } from '../repositories/prisma/ledgerRepository';
import { PrismaPayrollRepository } from '../repositories/prisma/payrollRepository';
import { PrismaDriverBalanceRepository } from '../repositories/prisma/driverBalanceRepository';
import { PrismaMetricsRepository } from '../repositories/prisma/metricsRepository';
import { monthEnd, monthStart, toDateOnly } from '../domain/dates';
import { decimalToScaledBigInt } from '../domain/math';
import { computeMonthlyMetrics } from './metricsAggregation';
import { computeDriverBalancesFromAggregates } from './driverBalanceAggregation';
import { determineAdvanceStatusUpdate } from './advanceStatusTransition';
import { createNotificationIfMissing } from './notifications';

const RATE_SCALE = 10000n;

const decimalToRateScaled = (value: unknown): bigint => {
  if (value === null || value === undefined) return 0n;
  if (typeof value === 'number') return BigInt(Math.round(value * Number(RATE_SCALE)));
  if (typeof value === 'string') return decimalToScaledBigInt(value, 4);
  return decimalToScaledBigInt(value.toString(), 4);
};

const groupLedgerByEntryType = async (companyId: string | null, start: Date, end: Date) => {
  const grouped = await prisma.ledger_entries.groupBy({
    by: ['entry_type'],
    where: {
      company_id: companyId ?? undefined,
      occurred_on: { gte: start, lte: end }
    },
    _sum: { amount: true }
  });

  return grouped.map((row) => ({
    entry_type: row.entry_type,
    _sum: { amount: row._sum.amount ? BigInt(row._sum.amount) : 0n }
  }));
};

export async function runDailyBatch(targetDate: Date): Promise<void> {
  const ledgerRepo = new PrismaLedgerRepository();
  const payrollRepo = new PrismaPayrollRepository();
  const balanceRepo = new PrismaDriverBalanceRepository();
  const metricsRepo = new PrismaMetricsRepository();

  const dateOnly = toDateOnly(targetDate);
  const payrolls = await payrollRepo.findPlannedOnOrBefore(dateOnly);

  for (const payroll of payrolls) {
    const balance = await ledgerRepo.sumAdvanceBalance(payroll.driverId, payroll.companyId, payroll.payoutDate);
    const overrideAmount = payroll.collectionOverrideAmount ?? null;
    const baseCollection = overrideAmount ?? balance;
    const cappedByGross = baseCollection > payroll.grossSalaryAmount ? payroll.grossSalaryAmount : baseCollection;
    const collection = cappedByGross > balance ? balance : cappedByGross;
    const netSalary = payroll.grossSalaryAmount - collection;

    if (payroll.status !== 'planned') continue;

    await ledgerRepo.insert({
      driverId: payroll.driverId,
      companyId: payroll.companyId,
      sourceType: 'payroll',
      sourceId: payroll.id,
      entryType: 'collection',
      amount: collection,
      occurredOn: payroll.payoutDate
    });

    await payrollRepo.save({
      ...payroll,
      advanceCollectionAmount: collection,
      collectionOverrideAmount: overrideAmount ?? undefined,
      collectionOverrideReason: payroll.collectionOverrideReason ?? undefined,
      netSalaryAmount: netSalary,
      status: 'processed',
      updatedAt: new Date()
    });

    const statusUpdate = determineAdvanceStatusUpdate(balance - collection, collection);
    if (statusUpdate === 'settling') {
      await prisma.advances.updateMany({
        where: { driver_id: payroll.driverId, company_id: payroll.companyId, status: 'paid' },
        data: { status: 'settling', updated_at: new Date() }
      });
    }

    await createNotificationIfMissing({
      recipientType: 'operator',
      recipientId: null,
      category: 'payroll',
      severity: 'info',
      title: '給与確定が完了しました',
      message: `driver=${payroll.driverId} company=${payroll.companyId} payout_date=${payroll.payoutDate.toISOString().slice(0, 10)}`,
      sourceType: 'payroll',
      sourceId: payroll.id
    });

  }

  const drivers = await prisma.drivers.findMany({ select: { id: true, company_id: true } });
  const companies = await prisma.companies.findMany({
    select: { id: true, limit_rate: true, allow_advance_over_salary: true, payout_day: true, payout_day_is_month_end: true }
  });
  const limitRatesByCompany = new Map(
    companies.map((company) => [company.id, decimalToRateScaled(company.limit_rate)])
  );
  const allowOverSalaryByCompany = new Map(
    companies.map((company) => [company.id, company.allow_advance_over_salary])
  );

  const earningsGrouped = await prisma.earnings.groupBy({
    by: ['driver_id'],
    where: {
      status: 'confirmed',
      payout_month: { gte: monthStart(dateOnly) }
    },
    _sum: { amount: true }
  });

  const earningsByDriver = new Map(
    earningsGrouped.map((row) => [row.driver_id, BigInt(row._sum.amount ?? 0)])
  );

  const currentMonthStart = monthStart(dateOnly);
  const currentMonthGrouped = await prisma.earnings.groupBy({
    by: ['driver_id'],
    where: {
      status: 'confirmed',
      payout_month: currentMonthStart
    },
    _sum: { amount: true }
  });
  const currentMonthByDriver = new Map(
    currentMonthGrouped.map((row) => [row.driver_id, BigInt(row._sum.amount ?? 0)])
  );

  const ledgerGrouped = await prisma.ledger_entries.groupBy({
    by: ['driver_id', 'entry_type'],
    where: {
      occurred_on: { lte: dateOnly }
    },
    _sum: { amount: true }
  });

  const ledgerByDriver = new Map<string, { advance_principal: bigint; collection: bigint; write_off: bigint }>();
  for (const row of ledgerGrouped) {
    const current = ledgerByDriver.get(row.driver_id) ?? { advance_principal: 0n, collection: 0n, write_off: 0n };
    const amount = BigInt(row._sum.amount ?? 0);
    if (row.entry_type === 'advance_principal') current.advance_principal += amount;
    if (row.entry_type === 'collection') current.collection += amount;
    if (row.entry_type === 'write_off') current.write_off += amount;
    ledgerByDriver.set(row.driver_id, current);
  }

  const balances = computeDriverBalancesFromAggregates(
    drivers.map((driver) => ({ id: driver.id, companyId: driver.company_id })),
    earningsByDriver,
    currentMonthByDriver,
    ledgerByDriver,
    limitRatesByCompany,
    allowOverSalaryByCompany,
    dateOnly
  );

  for (const balance of balances) {
    await balanceRepo.upsertBalance(balance);
    if (balance.advanceBalance === 0n) {
      await prisma.advances.updateMany({
        where: { driver_id: balance.driverId, company_id: balance.companyId, status: { in: ['paid', 'settling'] } },
        data: { status: 'settled', updated_at: new Date() }
      });
    } else if (balance.advanceBalance < 0n) {
      console.warn(`negative advance balance detected: driver=${balance.driverId} company=${balance.companyId}`);
      const sourceId = `${balance.driverId}:${balance.companyId}:${dateOnly.toISOString().slice(0, 10)}`;
      await createNotificationIfMissing({
        recipientType: 'operator',
        recipientId: null,
        category: 'system',
        severity: 'critical',
        title: '前借り残高が負になっています',
        message: `driver=${balance.driverId} company=${balance.companyId} の前借り残高が負です。`,
        sourceType: 'balance_check',
        sourceId
      });
      await createNotificationIfMissing({
        recipientType: 'company',
        recipientId: balance.companyId ?? null,
        category: 'system',
        severity: 'critical',
        title: '前借り残高が負になっています',
        message: `driver=${balance.driverId} の前借り残高が負です。`,
        sourceType: 'balance_check',
        sourceId
      });
    }
  }

  const monthStartDate = monthStart(dateOnly);
  const monthEndDate = monthEnd(dateOnly);

  for (const { id: companyId } of companies) {
    const grouped = await groupLedgerByEntryType(companyId, monthStartDate, monthEndDate);
    await metricsRepo.upsertMonthlyMetrics(computeMonthlyMetrics(grouped, monthStartDate, companyId));
  }

  const globalGrouped = await groupLedgerByEntryType(null, monthStartDate, monthEndDate);
  await metricsRepo.upsertMonthlyMetrics(computeMonthlyMetrics(globalGrouped, monthStartDate));

}
