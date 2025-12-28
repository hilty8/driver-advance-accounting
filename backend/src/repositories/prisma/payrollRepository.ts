import { payrolls as PrismaPayroll } from '@prisma/client';
import { Payroll, UUID } from '../../domain/types';
import { PayrollRepository } from '../interfaces';
import { prisma } from './client';

const mapPayroll = (row: PrismaPayroll): Payroll => ({
  id: row.id,
  driverId: row.driver_id,
  companyId: row.company_id,
  payoutDate: row.payout_date,
  grossSalaryAmount: BigInt(row.gross_salary_amount),
  advanceCollectionAmount: BigInt(row.advance_collection_amount),
  collectionOverrideAmount: row.collection_override_amount ? BigInt(row.collection_override_amount) : undefined,
  collectionOverrideReason: row.collection_override_reason ?? undefined,
  netSalaryAmount: row.net_salary_amount ? BigInt(row.net_salary_amount) : undefined,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export class PrismaPayrollRepository implements PayrollRepository {
  async findPlannedOnOrBefore(targetDate: Date): Promise<Payroll[]> {
    const rows = await prisma.payrolls.findMany({
      where: { status: 'planned', payout_date: { lte: targetDate } },
      orderBy: { payout_date: 'asc' }
    });
    return rows.map(mapPayroll);
  }

  async save(payroll: Payroll): Promise<Payroll> {
    const row = await prisma.payrolls.upsert({
      where: { id: payroll.id },
      update: {
        driver_id: payroll.driverId,
        company_id: payroll.companyId,
        payout_date: payroll.payoutDate,
        gross_salary_amount: payroll.grossSalaryAmount,
        advance_collection_amount: payroll.advanceCollectionAmount,
        collection_override_amount: payroll.collectionOverrideAmount ?? null,
        collection_override_reason: payroll.collectionOverrideReason ?? null,
        net_salary_amount: payroll.netSalaryAmount ?? null,
        status: payroll.status,
        updated_at: new Date()
      },
      create: {
        id: payroll.id,
        driver_id: payroll.driverId,
        company_id: payroll.companyId,
        payout_date: payroll.payoutDate,
        gross_salary_amount: payroll.grossSalaryAmount,
        advance_collection_amount: payroll.advanceCollectionAmount,
        collection_override_amount: payroll.collectionOverrideAmount ?? null,
        collection_override_reason: payroll.collectionOverrideReason ?? null,
        net_salary_amount: payroll.netSalaryAmount ?? null,
        status: payroll.status
      }
    });
    return mapPayroll(row);
  }
}
