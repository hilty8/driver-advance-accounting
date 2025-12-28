import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../repositories/prisma/client';
import { PrismaAdvanceRepository } from '../repositories/prisma/advanceRepository';
import { PrismaLedgerRepository } from '../repositories/prisma/ledgerRepository';
import { AdvanceService } from './services';
import { Advance, UUID, Yen } from './types';
import { monthStart, toDateOnly } from './dates';
import { decimalToScaledBigInt } from './math';
import { newUuid } from './ids';
import { calculateAdvanceLimit, calculateFee } from '../batch/batchMath';

const RATE_SCALE = 10000n;

const decimalToRateScaled = (value: Decimal | number | string): bigint => {
  if (typeof value === 'number') return BigInt(Math.round(value * Number(RATE_SCALE)));
  if (typeof value === 'string') return decimalToScaledBigInt(value, 4);
  return decimalToScaledBigInt(value.toString(), 4);
};

const ensureRequested = (advance: Advance): void => {
  if (advance.status !== 'requested') {
    throw new Error(`advance ${advance.id} is not in requested status`);
  }
};

export class AdvanceServiceImpl implements AdvanceService {
  private readonly advanceRepo = new PrismaAdvanceRepository();
  private readonly ledgerRepo = new PrismaLedgerRepository();

  async calculateAdvanceLimit(driverId: UUID, asOf: Date): Promise<Yen> {
    const driver = await prisma.drivers.findUnique({ where: { id: driverId } });
    if (!driver) throw new Error(`driver not found: ${driverId}`);

    const company = await prisma.companies.findUnique({ where: { id: driver.company_id } });
    if (!company) throw new Error(`company not found: ${driver.company_id}`);

    const unpaid = await prisma.earnings.aggregate({
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
    const currentMonthConfirmed = await prisma.earnings.aggregate({
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
    const baseLimit = calculateAdvanceLimit(unpaidConfirmed, advanceBalance, limitRateScaled, RATE_SCALE);

    if (!company.allow_advance_over_salary) {
      const cap = currentMonthAmount - advanceBalance;
      const effectiveCap = cap > 0n ? cap : 0n;
      return baseLimit < effectiveCap ? baseLimit : effectiveCap;
    }

    return baseLimit;
  }

  async requestAdvance(driverId: UUID, amount: Yen): Promise<Advance> {
    const limit = await this.calculateAdvanceLimit(driverId, new Date());
    if (amount <= 0n) throw new Error('requested amount must be positive');
    if (amount > limit) throw new Error('requested amount exceeds advance limit');

    const driver = await prisma.drivers.findUnique({ where: { id: driverId } });
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

    const company = await prisma.companies.findUnique({ where: { id: advance.companyId } });
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

  async markPayoutInstructed(advanceId: UUID, payoutScheduledAt: Date): Promise<Advance> {
    const advance = await this.advanceRepo.findById(advanceId);
    if (!advance) throw new Error(`advance not found: ${advanceId}`);

    return this.advanceRepo.save({
      ...advance,
      status: 'payout_instructed',
      payoutDate: toDateOnly(payoutScheduledAt),
      memo: advance.memo,
      updatedAt: new Date()
    });
  }

  async markPaid(advanceId: UUID, payoutDate: Date): Promise<Advance> {
    const advance = await this.advanceRepo.findById(advanceId);
    if (!advance) throw new Error(`advance not found: ${advanceId}`);

    return this.advanceRepo.save({
      ...advance,
      status: 'paid',
      payoutDate,
      updatedAt: new Date()
    });
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
