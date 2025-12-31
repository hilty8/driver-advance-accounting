import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../repositories/prisma/client';
import { PrismaAdvanceRepository } from '../repositories/prisma/advanceRepository';
import { PrismaLedgerRepository } from '../repositories/prisma/ledgerRepository';
import { AdvanceService } from './services';
import { Advance, UUID, Yen } from './types';
import { monthStart, toDateOnly } from './dates';
import { newUuid } from './ids';
import { calculateAdvanceLimit, calculateFee } from '../batch/batchMath';
import { computeAvailableAdvance, decimalToRateScaled, RATE_SCALE } from './advanceAvailability';

export class AdvanceStatusError extends Error {
  readonly status: string;
  readonly expectedStatus: string;

  constructor(advanceId: UUID, status: string, expectedStatus: string) {
    super(`advance ${advanceId} is not in ${expectedStatus} status`);
    this.name = 'AdvanceStatusError';
    this.status = status;
    this.expectedStatus = expectedStatus;
  }
}

export class AdvanceNotFoundError extends Error {
  constructor(advanceId: UUID) {
    super(`advance not found: ${advanceId}`);
    this.name = 'AdvanceNotFoundError';
  }
}

const ensureRequested = (advance: Advance): void => {
  if (advance.status !== 'requested') {
    throw new AdvanceStatusError(advance.id, advance.status, 'requested');
  }
};

const ensureApproved = (advance: Advance): void => {
  if (advance.status !== 'approved') {
    throw new AdvanceStatusError(advance.id, advance.status, 'approved');
  }
};

export class AdvanceServiceImpl implements AdvanceService {
  private readonly client: PrismaClient | Prisma.TransactionClient;
  private readonly advanceRepo: PrismaAdvanceRepository;
  private readonly ledgerRepo: PrismaLedgerRepository;

  constructor(client: PrismaClient | Prisma.TransactionClient = prisma) {
    this.client = client;
    this.advanceRepo = new PrismaAdvanceRepository(client);
    this.ledgerRepo = new PrismaLedgerRepository(client);
  }

  async calculateAdvanceLimit(driverId: UUID, asOf: Date): Promise<Yen> {
    const driver = await this.client.drivers.findUnique({ where: { id: driverId } });
    if (!driver) throw new Error(`driver not found: ${driverId}`);

    const company = await this.client.companies.findUnique({ where: { id: driver.company_id } });
    if (!company) throw new Error(`company not found: ${driver.company_id}`);

    const unpaid = await this.client.earnings.aggregate({
      where: {
        driver_id: driverId,
        company_id: driver.company_id,
        status: 'confirmed',
        payout_month: { gte: monthStart(asOf) }
      },
      _sum: { amount: true }
    });
    const unpaidConfirmed = BigInt(unpaid._sum.amount ?? 0);

    const currentMonth = monthStart(asOf);
    const currentMonthConfirmed = await this.client.earnings.aggregate({
      where: {
        driver_id: driverId,
        company_id: driver.company_id,
        status: 'confirmed',
        payout_month: currentMonth
      },
      _sum: { amount: true }
    });
    const currentMonthAmount = BigInt(currentMonthConfirmed._sum.amount ?? 0);

    const advanceBalance = await this.ledgerRepo.sumAdvanceBalance(driverId, driver.company_id, asOf);
    const limitRateScaled = decimalToRateScaled(company.limit_rate);
    return computeAvailableAdvance({
      unpaidConfirmed,
      advanceBalance,
      limitRateScaled,
      allowAdvanceOverSalary: company.allow_advance_over_salary,
      currentMonthConfirmed: currentMonthAmount,
      scale: RATE_SCALE
    });
  }

  async requestAdvance(driverId: UUID, amount: Yen): Promise<Advance> {
    const limit = await this.calculateAdvanceLimit(driverId, new Date());
    if (amount <= 0n) throw new Error('requested amount must be positive');
    if (amount > limit) throw new Error('requested amount exceeds advance limit');

    const driver = await this.client.drivers.findUnique({ where: { id: driverId } });
    if (!driver) throw new Error(`driver not found: ${driverId}`);

    const advance: Advance = {
      id: newUuid(),
      driverId,
      companyId: driver.company_id,
      requestedAmount: amount,
      requestedAt: new Date(),
      status: 'requested',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.advanceRepo.save(advance);
  }

  async approveAdvance(advanceId: UUID, approvedAt: Date): Promise<Advance> {
    const advance = await this.advanceRepo.findById(advanceId);
    if (!advance) throw new Error(`advance not found: ${advanceId}`);
    ensureRequested(advance);

    const company = await this.client.companies.findUnique({ where: { id: advance.companyId } });
    if (!company) throw new Error(`company not found: ${advance.companyId}`);

    const feeRateScaled = decimalToRateScaled(company.fee_rate);
    const fee = calculateFee(advance.requestedAmount, feeRateScaled, RATE_SCALE);
    const payoutAmount = advance.requestedAmount - fee;

    const updated: Advance = {
      ...advance,
      approvedAmount: advance.requestedAmount,
      feeAmount: fee,
      payoutAmount,
      status: 'approved',
      updatedAt: new Date()
    };

    const occurredOn = toDateOnly(approvedAt);

    await this.ledgerRepo.insert({
      driverId: advance.driverId,
      companyId: advance.companyId,
      sourceType: 'advance',
      sourceId: advance.id,
      entryType: 'advance_principal',
      amount: advance.requestedAmount,
      occurredOn
    });

    await this.ledgerRepo.insert({
      driverId: advance.driverId,
      companyId: advance.companyId,
      sourceType: 'advance',
      sourceId: advance.id,
      entryType: 'fee',
      amount: fee,
      occurredOn
    });

    return this.advanceRepo.save(updated);
  }

  async rejectAdvance(advanceId: UUID, reason?: string): Promise<Advance> {
    const advance = await this.advanceRepo.findById(advanceId);
    if (!advance) throw new Error(`advance not found: ${advanceId}`);
    ensureRequested(advance);

    return this.advanceRepo.save({
      ...advance,
      status: 'rejected',
      memo: reason ?? advance.memo,
      updatedAt: new Date()
    });
  }

  async markPaid(advanceId: UUID): Promise<Advance> {
    const result = await this.client.advances.updateMany({
      where: { id: advanceId, status: 'approved' },
      data: {
        status: 'paid',
        updated_at: new Date()
      }
    });
    if (result.count === 0) {
      const current = await this.client.advances.findUnique({
        where: { id: advanceId },
        select: { status: true }
      });
      if (!current) throw new AdvanceNotFoundError(advanceId);
      throw new AdvanceStatusError(advanceId, current.status, 'approved');
    }
    const updated = await this.advanceRepo.findById(advanceId);
    if (!updated) throw new Error(`advance not found: ${advanceId}`);
    return updated;
  }

  async writeOff(advanceId: UUID, amount: Yen, memo?: string): Promise<Advance> {
    const advance = await this.advanceRepo.findById(advanceId);
    if (!advance) throw new Error(`advance not found: ${advanceId}`);
    if (amount <= 0n) throw new Error('write off amount must be positive');
    const balance = await this.ledgerRepo.sumAdvanceBalance(advance.driverId, advance.companyId, new Date());
    if (amount > balance) throw new Error('write off amount exceeds advance balance');

    await this.ledgerRepo.insert({
      driverId: advance.driverId,
      companyId: advance.companyId,
      sourceType: 'write_off',
      sourceId: advance.id,
      entryType: 'write_off',
      amount,
      occurredOn: toDateOnly(new Date())
    });

    return this.advanceRepo.save({
      ...advance,
      status: 'written_off',
      memo: memo ?? advance.memo,
      updatedAt: new Date()
    });
  }
}
