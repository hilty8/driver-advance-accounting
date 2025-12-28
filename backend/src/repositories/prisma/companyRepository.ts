import { companies as PrismaCompany } from '@prisma/client';
import { Company, UUID } from '../../domain/types';
import { CompanyRepository } from '../interfaces';
import { prisma } from './client';

const mapCompany = (row: PrismaCompany): Company => ({
  id: row.id,
  name: row.name,
  limitRate: Number(row.limit_rate),
  feeRate: Number(row.fee_rate),
  payoutDay: row.payout_day ?? null,
  payoutDayIsMonthEnd: row.payout_day_is_month_end,
  payoutOffsetMonths: row.payout_offset_months,
  allowAdvanceOverSalary: row.allow_advance_over_salary,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export class PrismaCompanyRepository implements CompanyRepository {
  async findById(id: UUID): Promise<Company | null> {
    const row = await prisma.companies.findUnique({ where: { id } });
    return row ? mapCompany(row) : null;
  }

  async updateSettings(
    id: UUID,
    settings: Pick<Company, 'allowAdvanceOverSalary' | 'payoutDay' | 'payoutDayIsMonthEnd' | 'payoutOffsetMonths'>
  ): Promise<Company> {
    const row = await prisma.companies.update({
      where: { id },
      data: {
        payout_day: settings.payoutDay ?? null,
        payout_day_is_month_end: settings.payoutDayIsMonthEnd,
        payout_offset_months: settings.payoutOffsetMonths,
        allow_advance_over_salary: settings.allowAdvanceOverSalary,
        updated_at: new Date()
      }
    });
    return mapCompany(row);
  }
}
