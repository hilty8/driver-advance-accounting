import { Advance, Company, DriverBalanceMaterialized, LedgerEntry, MetricsMonthly, Payroll, UUID, Yen } from '../domain/types';

export interface AdvanceRepository {
  findById(id: UUID): Promise<Advance | null>;
  save(advance: Advance): Promise<Advance>;
  listPendingForCompany(companyId: UUID): Promise<Advance[]>;
}

export interface CompanyRepository {
  findById(id: UUID): Promise<Company | null>;
  updateSettings(
    id: UUID,
    settings: Pick<Company, 'allowAdvanceOverSalary' | 'payoutDay' | 'payoutDayIsMonthEnd' | 'payoutOffsetMonths'>
  ): Promise<Company>;
}

export interface PayrollRepository {
  findPlannedOnOrBefore(targetDate: Date): Promise<Payroll[]>;
  save(payroll: Payroll): Promise<Payroll>;
}

export interface LedgerRepository {
  insert(entry: Omit<LedgerEntry, 'id' | 'createdAt'>): Promise<LedgerEntry>;
  sumAdvanceBalance(driverId: UUID, companyId: UUID, asOf: Date): Promise<Yen>;
}

export interface MetricsRepository {
  upsertMonthlyMetrics(record: MetricsMonthly): Promise<MetricsMonthly>;
}

export interface DriverBalanceRepository {
  upsertBalance(balance: DriverBalanceMaterialized): Promise<DriverBalanceMaterialized>;
}

export interface TransactionRunner {
  runInTx<T>(fn: () => Promise<T>): Promise<T>;
}
