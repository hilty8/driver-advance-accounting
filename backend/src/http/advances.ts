import { z } from 'zod';
import { AdvanceServiceImpl } from '../domain/advanceServiceImpl';
import { parsePositiveBigInt } from './csv';
import { jsonError } from './errors';

const RequestSchema = z.object({
  amount: z.string()
});

const ApproveSchema = z.object({
  approvedAt: z.string()
});

const RejectSchema = z.object({
  reason: z.string().optional()
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
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

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
  const service = new AdvanceServiceImpl();
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    if (!input.advanceId) return { status: 400, body: jsonError('advanceId is required') };
    const parsed = ApproveSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }
    const approvedAt = parseDateTime(parsed.data.approvedAt);
    if (!approvedAt) return { status: 400, body: jsonError('approvedAt is invalid') };

    try {
      const advance = await service.approveAdvance(input.advanceId, approvedAt);
      return { status: 200, body: advance };
    } catch (error) {
      return { status: 400, body: jsonError((error as Error).message) };
    }
  };
};

export const createAdvanceRejectHandler = () => {
  const service = new AdvanceServiceImpl();
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    if (!input.advanceId) return { status: 400, body: jsonError('advanceId is required') };
    const parsed = RejectSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    try {
      const advance = await service.rejectAdvance(input.advanceId, parsed.data.reason);
      return { status: 200, body: advance };
    } catch (error) {
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
