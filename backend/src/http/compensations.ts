import { z } from 'zod';
import { prisma } from '../repositories/prisma/client';
import { newUuid } from '../domain/ids';
import { toDateOnly } from '../domain/dates';
import { parsePositiveBigInt } from './csv';
import { jsonError } from './errors';

const CompensationSchema = z.object({
  amount: z.string(),
  occurredOn: z.string().optional(),
  memo: z.string().optional()
});

type HandlerInput = {
  driverId?: string;
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

const parseDate = (value?: string): Date | null => {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

export const createCompensationLoanHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    if (!input.driverId) return { status: 400, body: jsonError('driverId is required') };
    const parsed = CompensationSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const amount = parsePositiveBigInt(parsed.data.amount);
    if (amount === null) return { status: 400, body: jsonError('amount must be positive integer') };

    const occurredAt = parseDate(parsed.data.occurredOn);
    if (!occurredAt) return { status: 400, body: jsonError('occurredOn is invalid') };

    const driver = await prisma.drivers.findUnique({ where: { id: input.driverId } });
    if (!driver) return { status: 404, body: jsonError('driver not found') };

    const advanceId = newUuid();
    const dateOnly = toDateOnly(occurredAt);

    const [advance] = await prisma.$transaction([
      prisma.advances.create({
        data: {
          id: advanceId,
          driver_id: driver.id,
          company_id: driver.company_id,
          requested_amount: amount,
          requested_at: new Date(),
          approved_amount: amount,
          fee_amount: 0n,
          payout_amount: amount,
          payout_date: dateOnly,
          status: 'paid',
          memo: parsed.data.memo ?? null
        }
      }),
      prisma.ledger_entries.create({
        data: {
          driver_id: driver.id,
          company_id: driver.company_id,
          source_type: 'advance',
          source_id: advanceId,
          entry_type: 'advance_principal',
          amount,
          occurred_on: dateOnly
        }
      })
    ]);

    return { status: 201, body: advance };
  };
};
