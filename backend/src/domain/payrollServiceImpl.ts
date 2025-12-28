import { prisma } from '../repositories/prisma/client';
import { PrismaLedgerRepository } from '../repositories/prisma/ledgerRepository';
import { PrismaPayrollRepository } from '../repositories/prisma/payrollRepository';
import { PayrollService } from './services';
import { Payroll, UUID, Yen } from './types';
import { newUuid } from './ids';
import { toDateOnly } from './dates';

export class PayrollServiceImpl implements PayrollService {
  private readonly payrollRepo = new PrismaPayrollRepository();
  private readonly ledgerRepo = new PrismaLedgerRepository();

  async planPayroll(driverId: UUID, payoutDate: Date, grossSalary: Yen): Promise<Payroll> {
    const driver = await prisma.drivers.findUnique({ where: { id: driverId } });
    if (!driver) throw new Error(`driver not found: ${driverId}`);

    const payroll: Payroll = {
      id: newUuid(),
      driverId,
      companyId: driver.company_id,
      payoutDate: toDateOnly(payoutDate),
      grossSalaryAmount: grossSalary,
      advanceCollectionAmount: 0n,
      status: 'planned',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.payrollRepo.save(payroll);
  }

  async processPayroll(payoutId: UUID, targetDate: Date): Promise<Payroll> {
    const row = await prisma.payrolls.findUnique({ where: { id: payoutId } });
    if (!row) throw new Error(`payroll not found: ${payoutId}`);
    if (row.status !== 'planned') {
      return this.payrollRepo.save({
        id: row.id,
        driverId: row.driver_id,
        companyId: row.company_id,
        payoutDate: row.payout_date,
        grossSalaryAmount: BigInt(row.gross_salary_amount),
        advanceCollectionAmount: BigInt(row.advance_collection_amount),
        netSalaryAmount: row.net_salary_amount ? BigInt(row.net_salary_amount) : undefined,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    }

    if (row.payout_date > targetDate) {
      throw new Error('payout_date is after target_date');
    }

    const balance = await this.ledgerRepo.sumAdvanceBalance(row.driver_id, row.company_id, row.payout_date);
    const gross = BigInt(row.gross_salary_amount);
    const overrideAmount = row.collection_override_amount ? BigInt(row.collection_override_amount) : null;
    const baseCollection = overrideAmount ?? balance;
    const cappedByGross = baseCollection > gross ? gross : baseCollection;
    const collection = cappedByGross > balance ? balance : cappedByGross;
    const netSalary = gross - collection;

    await this.ledgerRepo.insert({
      driverId: row.driver_id,
      companyId: row.company_id,
      sourceType: 'payroll',
      sourceId: row.id,
      entryType: 'collection',
      amount: collection,
      occurredOn: row.payout_date
    });

    const payroll: Payroll = {
      id: row.id,
      driverId: row.driver_id,
      companyId: row.company_id,
      payoutDate: row.payout_date,
      grossSalaryAmount: gross,
      advanceCollectionAmount: collection,
      collectionOverrideAmount: overrideAmount ?? undefined,
      collectionOverrideReason: row.collection_override_reason ?? undefined,
      netSalaryAmount: netSalary,
      status: 'processed',
      createdAt: row.created_at,
      updatedAt: new Date()
    };

    return this.payrollRepo.save(payroll);
  }
}
