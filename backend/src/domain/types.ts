export type UUID = string;
export type Yen = bigint;

export type EarningStatus = 'confirmed' | 'paid';
export type AdvanceStatus = 'requested' | 'rejected' | 'approved' | 'payout_instructed' | 'paid' | 'settling' | 'settled' | 'written_off';
export type PayrollStatus = 'planned' | 'processed';
export type LedgerSourceType = 'advance' | 'payroll' | 'manual_adjustment' | 'write_off';
export type LedgerEntryType = 'advance_principal' | 'fee' | 'collection' | 'write_off';
export type UserRole = 'admin' | 'operator' | 'company' | 'driver';

export interface Company {
  id: UUID;
  name: string;
  limitRate: number; // e.g. 0.8
  feeRate: number;   // e.g. 0.05
  payoutDay?: number | null;
  payoutDayIsMonthEnd: boolean;
  payoutOffsetMonths: number;
  allowAdvanceOverSalary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Driver {
  id: UUID;
  companyId: UUID;
  externalId?: string;
  name: string;
  email?: string;
  memo?: string;
  bankAccount?: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Earning {
  id: UUID;
  driverId: UUID;
  companyId: UUID;
  workMonth: Date;
  payoutMonth: Date;
  amount: Yen;
  status: EarningStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Advance {
  id: UUID;
  driverId: UUID;
  companyId: UUID;
  requestedAmount: Yen;
  requestedAt: Date;
  approvedAmount?: Yen;
  feeAmount?: Yen;
  payoutAmount?: Yen;
  payoutDate?: Date;
  status: AdvanceStatus;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payroll {
  id: UUID;
  driverId: UUID;
  companyId: UUID;
  payoutDate: Date;
  grossSalaryAmount: Yen;
  advanceCollectionAmount: Yen;
  collectionOverrideAmount?: Yen;
  collectionOverrideReason?: string;
  netSalaryAmount?: Yen;
  status: PayrollStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface LedgerEntry {
  id: UUID;
  driverId: UUID;
  companyId: UUID;
  sourceType: LedgerSourceType;
  sourceId: UUID;
  entryType: LedgerEntryType;
  amount: Yen;
  occurredOn: Date;
  createdAt: Date;
}

export interface DriverBalanceMaterialized {
  driverId: UUID;
  companyId?: UUID;
  advanceBalance: Yen;
  unpaidConfirmedEarnings: Yen;
  advanceLimit: Yen;
  asOfDate: Date;
  refreshedAt: Date;
}

export interface MetricsMonthly {
  id: UUID;
  companyId?: UUID;
  yearMonth: Date;
  totalAdvancePrincipal: Yen;
  totalFeeRevenue: Yen;
  totalCollectedPrincipal: Yen;
  totalWrittenOffPrincipal: Yen;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: UUID;
  email: string;
  passwordHash: string;
  role: UserRole;
  companyId?: UUID;
  driverId?: UUID;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PasswordResetToken {
  id: UUID;
  userId: UUID;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

export interface DriverInvitation {
  id: UUID;
  companyId: UUID;
  driverId: UUID;
  email: string;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}
