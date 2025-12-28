import { CompanyRepository } from '../repositories/interfaces';
import { Company, UUID } from './types';

const ALLOWED_PAYOUT_DAYS = new Set([1, 5, 10, 15, 20, 25]);

type SettingsInput = {
  payoutDayIsMonthEnd: boolean;
  payoutDay: number | null;
  allowAdvanceOverSalary?: boolean;
};

export class CompanySettingsService {
  constructor(private readonly companyRepo: CompanyRepository) {}

  async setCompanySettings(companyId: UUID, input: SettingsInput): Promise<Company> {
    const company = await this.companyRepo.findById(companyId);
    if (!company) throw new Error('company not found');

    if (input.payoutDayIsMonthEnd) {
      if (input.payoutDay !== null) throw new Error('payout day must be null for month-end');
    } else {
      if (input.payoutDay === null) throw new Error('payout day is required');
      if (!ALLOWED_PAYOUT_DAYS.has(input.payoutDay)) throw new Error('invalid payout day');
    }

    return this.companyRepo.updateSettings(companyId, {
      payoutDay: input.payoutDay,
      payoutDayIsMonthEnd: input.payoutDayIsMonthEnd,
      payoutOffsetMonths: company.payoutOffsetMonths ?? 2,
      allowAdvanceOverSalary: input.allowAdvanceOverSalary ?? company.allowAdvanceOverSalary
    });
  }
}
