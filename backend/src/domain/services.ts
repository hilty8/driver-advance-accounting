import { Advance, Payroll, UUID, Yen } from './types';

export interface AdvanceService {
  calculateAdvanceLimit(driverId: UUID, asOf: Date): Promise<Yen>;
  requestAdvance(driverId: UUID, amount: Yen): Promise<Advance>;
  approveAdvance(advanceId: UUID, approvedAt: Date): Promise<Advance>;
  rejectAdvance(advanceId: UUID, reason?: string): Promise<Advance>;
  markPaid(advanceId: UUID, payoutDate: Date): Promise<Advance>;
  writeOff(advanceId: UUID, amount: Yen, memo?: string): Promise<Advance>;
}

export interface PayrollService {
  planPayroll(driverId: UUID, payoutDate: Date, grossSalary: Yen): Promise<Payroll>;
  processPayroll(payoutId: UUID, targetDate: Date): Promise<Payroll>;
}

export interface BatchService {
  runDailyBatch(targetDate: Date): Promise<void>;
}
