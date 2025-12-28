import { CompanySettingsService } from '../../src/domain/companySettingsService';
import { Company } from '../../src/domain/types';
import { createCompanySettingsHandler } from '../../src/http/companySettings';

class InMemoryCompanyRepository {
  private readonly companies = new Map<string, Company>();

  constructor(seed: Company[]) {
    for (const company of seed) this.companies.set(company.id, company);
  }

  async findById(id: string): Promise<Company | null> {
    return this.companies.get(id) ?? null;
  }

  async updateSettings(id: string, settings: Pick<Company, 'payoutDay' | 'payoutDayIsMonthEnd' | 'allowAdvanceOverSalary' | 'payoutOffsetMonths'>): Promise<Company> {
    const current = this.companies.get(id);
    if (!current) throw new Error('company not found');
    const updated = { ...current, ...settings, updatedAt: new Date() } as Company;
    this.companies.set(id, updated);
    return updated;
  }
}

describe('[F09][SF01] company settings handler', () => {
  const baseCompany: Company = {
    id: 'company-1',
    name: 'Acme',
    limitRate: 0.8,
    feeRate: 0.05,
    payoutDay: 5,
    payoutDayIsMonthEnd: false,
    payoutOffsetMonths: 2,
    allowAdvanceOverSalary: false,
    isActive: true,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  };

  test('returns 400 on invalid payload', async () => {
    const repo = new InMemoryCompanyRepository([baseCompany]);
    const service = new CompanySettingsService(repo);
    const handler = createCompanySettingsHandler(service);

    const res = await handler({
      companyId: 'company-1',
      body: { payoutDayIsMonthEnd: 'nope', payoutDay: 5 }
    });

    const body = res.body as { error?: string };
    expect(res.status).toBe(400);
    expect(body.error).toContain('invalid');
  });

  test('updates settings on valid payload', async () => {
    const repo = new InMemoryCompanyRepository([baseCompany]);
    const service = new CompanySettingsService(repo);
    const handler = createCompanySettingsHandler(service);

    const res = await handler({
      companyId: 'company-1',
      body: { payoutDayIsMonthEnd: true, payoutDay: null, allowAdvanceOverSalary: true }
    });

    const body = res.body as { payoutDayIsMonthEnd?: boolean; payoutDay?: number | null; allowAdvanceOverSalary?: boolean };
    expect(res.status).toBe(200);
    expect(body.payoutDayIsMonthEnd).toBe(true);
    expect(body.payoutDay).toBeNull();
    expect(body.allowAdvanceOverSalary).toBe(true);
  });
});
