import { z } from 'zod';
import { prisma } from '../repositories/prisma/client';
import { parsePositiveBigInt } from './csv';
import { jsonError } from './errors';

const OverrideSchema = z.object({
  collectionAmount: z.string(),
  reason: z.string().optional()
});

type HandlerInput = {
  payrollId?: string;
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

export const createCollectionOverrideHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    if (!input.payrollId) return { status: 400, body: jsonError('payrollId is required') };
    const parsed = OverrideSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const amount = parsePositiveBigInt(parsed.data.collectionAmount);
    if (amount === null) return { status: 400, body: jsonError('collectionAmount must be positive integer') };

    const payroll = await prisma.payrolls.findUnique({ where: { id: input.payrollId } });
    if (!payroll) return { status: 404, body: jsonError('payroll not found') };
    if (payroll.status !== 'planned') {
      return { status: 409, body: jsonError('payroll already processed') };
    }

    const updated = await prisma.payrolls.update({
      where: { id: input.payrollId },
      data: {
        collection_override_amount: amount,
        collection_override_reason: parsed.data.reason ?? null,
        updated_at: new Date()
      }
    });

    return { status: 200, body: updated };
  };
};
