import { z } from 'zod';
import { prisma } from '../repositories/prisma/client';
import { jsonError } from './errors';

type HandlerInput = {
  companyId: string;
  query: Record<string, string | undefined>;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

export const createCompanySettingsGetHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const company = await prisma.companies.findUnique({ where: { id: input.companyId } });
    if (!company) {
      return { status: 404, body: jsonError('company not found') };
    }

    return {
      status: 200,
      body: {
        companyId: company.id,
        payoutDay: company.payout_day ?? null,
        payoutDayIsMonthEnd: company.payout_day_is_month_end,
        payoutOffsetMonths: company.payout_offset_months,
        allowAdvanceOverSalary: company.allow_advance_over_salary
      }
    };
  };
};
