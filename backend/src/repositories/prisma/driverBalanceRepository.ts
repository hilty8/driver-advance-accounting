import { driver_balances_materialized as PrismaBalance } from '@prisma/client';
import { DriverBalanceMaterialized } from '../../domain/types';
import { DriverBalanceRepository } from '../interfaces';
import { prisma } from './client';

const mapBalance = (row: PrismaBalance): DriverBalanceMaterialized => ({
  driverId: row.driver_id,
  companyId: row.company_id ?? undefined,
  advanceBalance: BigInt(row.advance_balance),
  unpaidConfirmedEarnings: BigInt(row.unpaid_confirmed_earnings),
  advanceLimit: BigInt(row.advance_limit),
  asOfDate: row.as_of_date,
  refreshedAt: row.refreshed_at
});

export class PrismaDriverBalanceRepository implements DriverBalanceRepository {
  async upsertBalance(balance: DriverBalanceMaterialized): Promise<DriverBalanceMaterialized> {
    const row = await prisma.driver_balances_materialized.upsert({
      where: { driver_id: balance.driverId },
      update: {
        company_id: balance.companyId ?? null,
        advance_balance: balance.advanceBalance,
        unpaid_confirmed_earnings: balance.unpaidConfirmedEarnings,
        advance_limit: balance.advanceLimit,
        as_of_date: balance.asOfDate,
        refreshed_at: new Date()
      },
      create: {
        driver_id: balance.driverId,
        company_id: balance.companyId ?? null,
        advance_balance: balance.advanceBalance,
        unpaid_confirmed_earnings: balance.unpaidConfirmedEarnings,
        advance_limit: balance.advanceLimit,
        as_of_date: balance.asOfDate,
        refreshed_at: balance.refreshedAt
      }
    });
    return mapBalance(row);
  }
}
