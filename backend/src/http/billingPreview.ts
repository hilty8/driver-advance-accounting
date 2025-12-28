import { z } from 'zod';
import { prisma } from '../repositories/prisma/client';
import { calculateBillingFee, resolveBillingRateScaled } from '../domain/billingTier';
import { monthStart } from '../domain/dates';
import { jsonError } from './errors';

const PreviewSchema = z.object({
  companyId: z.string().optional(),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/)
});

type HandlerInput = {
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

const toMonthStart = (yearMonth: string): Date => {
  const [year, month] = yearMonth.split('-').map(Number);
  return monthStart(new Date(Date.UTC(year, month - 1, 1)));
};

export const createBillingPreviewHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = PreviewSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const { companyId, yearMonth } = parsed.data;
    const periodStart = toMonthStart(yearMonth);

    const metrics = await prisma.metrics_monthly.findMany({
      where: {
        year_month: periodStart,
        company_id: companyId ?? undefined
      }
    });

    const previews = metrics.map((row) => {
      const principal = BigInt(row.total_advance_principal);
      const rateScaled = resolveBillingRateScaled(principal);
      const fee = calculateBillingFee(principal);

      return {
        companyId: row.company_id,
        yearMonth,
        totalAdvancePrincipal: principal.toString(),
        rateScaled: rateScaled.toString(),
        billingFee: fee.toString()
      };
    });

    return { status: 200, body: { previews } };
  };
};
