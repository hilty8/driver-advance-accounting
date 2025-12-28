import { z } from 'zod';
import { CompanySettingsService } from '../domain/companySettingsService';
import { jsonError } from './errors';

const SettingsSchema = z.object({
  payoutDayIsMonthEnd: z.boolean(),
  payoutDay: z.number().int().nullable(),
  allowAdvanceOverSalary: z.boolean().optional()
}).superRefine((value, ctx) => {
  const allowedDays = new Set([1, 5, 10, 15, 20, 25]);
  if (value.payoutDayIsMonthEnd) {
    if (value.payoutDay !== null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'payout day must be null for month-end', path: ['payoutDay'] });
    }
  } else {
    if (value.payoutDay === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'payout day is required', path: ['payoutDay'] });
    } else if (!allowedDays.has(value.payoutDay)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'invalid payout day', path: ['payoutDay'] });
    }
  }
});

type HandlerInput = {
  companyId: string;
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

export const createCompanySettingsHandler = (service: CompanySettingsService) => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = SettingsSchema.safeParse(input.body);
    if (!parsed.success) {
      return {
        status: 400,
        body: jsonError('invalid payload', parsed.error.flatten())
      };
    }

    try {
      const updated = await service.setCompanySettings(input.companyId, parsed.data);
      return { status: 200, body: updated };
    } catch (error) {
      return { status: 400, body: jsonError((error as Error).message) };
    }
  };
};
