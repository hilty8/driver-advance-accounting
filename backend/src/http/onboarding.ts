import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { hashPassword } from '../domain/passwords';
import { prisma } from '../repositories/prisma/client';
import { getStripeClient } from '../integrations/stripeClient';
import { jsonError } from './errors';

const OnboardSchema = z.object({
  companyName: z.string().min(1),
  companyEmail: z.string().email().optional(),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(1),
  limitRate: z.string().optional(),
  feeRate: z.string().optional(),
  payoutDayIsMonthEnd: z.boolean().optional(),
  payoutDay: z.number().int().nullable().optional(),
  payoutOffsetMonths: z.number().int().optional(),
  allowAdvanceOverSalary: z.boolean().optional(),
  createStripeCustomer: z.boolean().optional()
}).superRefine((value, ctx) => {
  const allowedDays = new Set([1, 5, 10, 15, 20, 25]);
  if (value.payoutDayIsMonthEnd) {
    if (value.payoutDay !== null && value.payoutDay !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'payout day must be null for month-end', path: ['payoutDay'] });
    }
  } else if (value.payoutDay !== undefined) {
    if (value.payoutDay === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'payout day is required', path: ['payoutDay'] });
    } else if (!allowedDays.has(value.payoutDay)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'invalid payout day', path: ['payoutDay'] });
    }
  }
});

type HandlerInput = {
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

export const createCompanyOnboardingHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = OnboardSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const {
      companyName,
      companyEmail,
      adminEmail,
      adminPassword,
      limitRate,
      feeRate,
      payoutDayIsMonthEnd,
      payoutDay,
      payoutOffsetMonths,
      allowAdvanceOverSalary,
      createStripeCustomer
    } = parsed.data;

    const existingUser = await prisma.users.findFirst({ where: { email: adminEmail } });
    if (existingUser) return { status: 409, body: jsonError('email already exists') };

    const passwordHash = hashPassword(adminPassword);

    const { company, user } = await prisma.$transaction(async (tx) => {
      const companyData: Prisma.companiesCreateInput = { name: companyName };
      if (limitRate !== undefined) companyData.limit_rate = limitRate;
      if (feeRate !== undefined) companyData.fee_rate = feeRate;
      if (payoutDay !== undefined) companyData.payout_day = payoutDay;
      if (payoutDayIsMonthEnd !== undefined) companyData.payout_day_is_month_end = payoutDayIsMonthEnd;
      if (payoutOffsetMonths !== undefined) companyData.payout_offset_months = payoutOffsetMonths;
      if (allowAdvanceOverSalary !== undefined) companyData.allow_advance_over_salary = allowAdvanceOverSalary;

      const createdCompany = await tx.companies.create({
        data: companyData
      });

      const createdUser = await tx.users.create({
        data: {
          email: adminEmail,
          password_hash: passwordHash,
          role: 'company',
          company_id: createdCompany.id,
          is_active: true
        },
        select: {
          id: true,
          email: true,
          role: true,
          company_id: true,
          driver_id: true,
          is_active: true,
          created_at: true,
          updated_at: true
        }
      });

      return { company: createdCompany, user: createdUser };
    });

    let stripeStatus = 'skipped';
    if (createStripeCustomer) {
      const stripe = getStripeClient();
      if (!stripe) {
        stripeStatus = 'not_configured';
      } else {
        const customer = await stripe.customers.create({
          name: companyName,
          email: companyEmail ?? adminEmail,
          metadata: { company_id: company.id }
        });
        await prisma.companies.update({
          where: { id: company.id },
          data: { stripe_customer_id: customer.id, updated_at: new Date() }
        });
        stripeStatus = 'created';
      }
    }

    return { status: 201, body: { company, user, stripeStatus } };
  };
};
