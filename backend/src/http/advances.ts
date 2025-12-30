import { z } from 'zod';
import { AdvanceServiceImpl, AdvanceStatusError } from '../domain/advanceServiceImpl';
import { parsePositiveBigInt } from './csv';
import { jsonError } from './errors';
import { prisma } from '../repositories/prisma/client';
import { PrismaLedgerRepository } from '../repositories/prisma/ledgerRepository';
import { computeAvailableAdvance, decimalToRateScaled, RATE_SCALE } from '../domain/advanceAvailability';
import { monthStart } from '../domain/dates';

const RequestSchema = z.object({
  amount: z.string()
});

const ApproveSchema = z.object({
  approvedAt: z.string()
});

const RejectSchema = z.object({
  reason: z.string().trim().min(1).max(500)
});

const PayoutInstructSchema = z.object({
  payoutScheduledAt: z.string()
});

const MarkPaidSchema = z.object({
  payoutDate: z.string()
});

type HandlerInput = {
  driverId?: string;
  advanceId?: string;
  companyId?: string;
  actorUserId?: string;
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

const mapAdvanceRow = (row: {
  id: string;
  driver_id: string;
  company_id: string;
  requested_amount: bigint;
  requested_at: Date;
  approved_amount: bigint | null;
  fee_amount: bigint | null;
  payout_amount: bigint | null;
  payout_date: Date | null;
  status: string;
  memo: string | null;
  created_at: Date;
  updated_at: Date;
  driver?: { email: string | null; name: string | null } | null;
}) => ({
  id: row.id,
  driverId: row.driver_id,
  companyId: row.company_id,
  driverEmail: row.driver?.email ?? undefined,
  driverName: row.driver?.name ?? undefined,
  requestedAmount: row.requested_amount,
  requestedAt: row.requested_at,
  approvedAmount: row.approved_amount ?? undefined,
  feeAmount: row.fee_amount ?? undefined,
  payoutAmount: row.payout_amount ?? undefined,
  payoutDate: row.payout_date ?? undefined,
  status: row.status,
  memo: row.memo ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const parseDateTime = (value: string): Date | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const createAdvanceRequestHandler = () => {
  const service = new AdvanceServiceImpl();
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    if (!input.driverId) return { status: 400, body: jsonError('driverId is required') };
    const parsed = RequestSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }
    const amount = parsePositiveBigInt(parsed.data.amount);
    if (amount === null) return { status: 400, body: jsonError('amount must be positive integer') };

    try {
      const advance = await service.requestAdvance(input.driverId, amount);
      return { status: 201, body: advance };
    } catch (error) {
      return { status: 400, body: jsonError((error as Error).message) };
    }
  };
};

export const createAdvanceApproveHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    if (!input.advanceId) return { status: 400, body: jsonError('advanceId is required') };
    if (!input.actorUserId) return { status: 400, body: jsonError('actorUserId is required') };
    const advanceId = input.advanceId;
    const actorUserId = input.actorUserId;
    const parsed = ApproveSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }
    const approvedAt = parseDateTime(parsed.data.approvedAt);
    if (!approvedAt) return { status: 400, body: jsonError('approvedAt is invalid') };

    try {
      const advance = await prisma.$transaction(async (tx) => {
        const service = new AdvanceServiceImpl(tx);
        const updated = await service.approveAdvance(advanceId, approvedAt);
        await tx.advance_audit_logs.create({
          data: {
            advance_id: updated.id,
            company_id: updated.companyId,
            driver_id: updated.driverId,
            actor_user_id: actorUserId,
            action: 'approved'
          }
        });
        return updated;
      });
      return { status: 200, body: advance };
    } catch (error) {
      if (error instanceof AdvanceStatusError) {
        return { status: 409, body: jsonError('advance is not in requested status') };
      }
      return { status: 400, body: jsonError((error as Error).message) };
    }
  };
};

export const createAdvanceRejectHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    if (!input.advanceId) return { status: 400, body: jsonError('advanceId is required') };
    if (!input.actorUserId) return { status: 400, body: jsonError('actorUserId is required') };
    const advanceId = input.advanceId;
    const actorUserId = input.actorUserId;
    const parsed = RejectSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    try {
      const reason = parsed.data.reason.trim();
      const advance = await prisma.$transaction(async (tx) => {
        const service = new AdvanceServiceImpl(tx);
        const updated = await service.rejectAdvance(advanceId, reason);
        await tx.advance_audit_logs.create({
          data: {
            advance_id: updated.id,
            company_id: updated.companyId,
            driver_id: updated.driverId,
            actor_user_id: actorUserId,
            action: 'rejected',
            reason
          }
        });
        return updated;
      });
      return { status: 200, body: advance };
    } catch (error) {
      if (error instanceof AdvanceStatusError) {
        return { status: 409, body: jsonError('advance is not in requested status') };
      }
      return { status: 400, body: jsonError((error as Error).message) };
    }
  };
};

export const createAdvancePayoutInstructHandler = () => {
  const service = new AdvanceServiceImpl();
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    if (!input.advanceId) return { status: 400, body: jsonError('advanceId is required') };
    const parsed = PayoutInstructSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }
    const payoutScheduledAt = parseDateTime(parsed.data.payoutScheduledAt);
    if (!payoutScheduledAt) return { status: 400, body: jsonError('payoutScheduledAt is invalid') };

    try {
      const advance = await service.markPayoutInstructed(input.advanceId, payoutScheduledAt);
      return { status: 200, body: advance };
    } catch (error) {
      return { status: 400, body: jsonError((error as Error).message) };
    }
  };
};

export const createAdvanceMarkPaidHandler = () => {
  const service = new AdvanceServiceImpl();
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    if (!input.advanceId) return { status: 400, body: jsonError('advanceId is required') };
    const parsed = MarkPaidSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }
    const payoutDate = parseDateTime(parsed.data.payoutDate);
    if (!payoutDate) return { status: 400, body: jsonError('payoutDate is invalid') };

    try {
      const advance = await service.markPaid(input.advanceId, payoutDate);
      return { status: 200, body: advance };
    } catch (error) {
      return { status: 400, body: jsonError((error as Error).message) };
    }
  };
};

export const createCompanyAdvancesListHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    if (!input.companyId) return { status: 400, body: jsonError('companyId is required') };
    const rows = await prisma.advances.findMany({
      where: { company_id: input.companyId },
      orderBy: { created_at: 'desc' },
    include: { driver: { select: { email: true, name: true } } }
    });
    const advances = rows.map(mapAdvanceRow);
    return { status: 200, body: advances };
  };
};

export const createDriverAdvanceAvailabilityHandler = () => {
  const ledgerRepo = new PrismaLedgerRepository();
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    if (!input.driverId) return { status: 400, body: jsonError('driverId is required') };

    const driver = await prisma.drivers.findUnique({ where: { id: input.driverId } });
    if (!driver) return { status: 404, body: jsonError('driver not found') };

    const company = await prisma.companies.findUnique({ where: { id: driver.company_id } });
    if (!company) return { status: 404, body: jsonError('company not found') };

    const now = new Date();
    const unpaid = await prisma.earnings.aggregate({
      where: {
        driver_id: driver.id,
        company_id: driver.company_id,
        status: 'confirmed',
        payout_month: { gte: monthStart(now) }
      },
      _sum: { amount: true }
    });
    const unpaidConfirmed = BigInt(unpaid._sum.amount ?? 0);

    const currentMonth = monthStart(now);
    const currentMonthConfirmed = await prisma.earnings.aggregate({
      where: {
        driver_id: driver.id,
        company_id: driver.company_id,
        status: 'confirmed',
        payout_month: currentMonth
      },
      _sum: { amount: true }
    });
    const currentMonthAmount = BigInt(currentMonthConfirmed._sum.amount ?? 0);

    const advanceBalance = await ledgerRepo.sumAdvanceBalance(driver.id, driver.company_id, now);
    const limitRateScaled = decimalToRateScaled(company.limit_rate);
    const availableAmount = computeAvailableAdvance({
      unpaidConfirmed,
      advanceBalance,
      limitRateScaled,
      allowAdvanceOverSalary: company.allow_advance_over_salary,
      currentMonthConfirmed: currentMonthAmount,
      scale: RATE_SCALE
    });

    return {
      status: 200,
      body: {
        availableAmount,
        deductedAmount: advanceBalance
      }
    };
  };
};
