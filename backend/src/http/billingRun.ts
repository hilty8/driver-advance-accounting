import { z } from 'zod';
import { prisma } from '../repositories/prisma/client';
import { calculateBillingFee, resolveBillingRateScaled } from '../domain/billingTier';
import { monthStart } from '../domain/dates';
import { getStripeClient } from '../integrations/stripeClient';
import { jsonError } from './errors';

const RunSchema = z.object({
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

export const createBillingRunHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = RunSchema.safeParse(input.body);
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

    const stripe = getStripeClient();
    const results = [] as Array<{
      companyId: string | null;
      yearMonth: string;
      totalAdvancePrincipal: string;
      rateScaled: string;
      billingFee: string;
      recordedId: string | null;
      stripeInvoiceId: string | null;
      stripeStatus: string;
    }>;

    for (const row of metrics) {
      if (!row.company_id) {
        results.push({
          companyId: null,
          yearMonth,
          totalAdvancePrincipal: row.total_advance_principal.toString(),
          rateScaled: '0',
          billingFee: '0',
          recordedId: null,
          stripeInvoiceId: null,
          stripeStatus: 'skipped'
        });
        continue;
      }

      const company = await prisma.companies.findUnique({ where: { id: row.company_id } });
      if (!company) {
        results.push({
          companyId: row.company_id,
          yearMonth,
          totalAdvancePrincipal: row.total_advance_principal.toString(),
          rateScaled: '0',
          billingFee: '0',
          recordedId: null,
          stripeInvoiceId: null,
          stripeStatus: 'company_missing'
        });
        continue;
      }

      if (!company.stripe_customer_id || !stripe) {
        const record = await prisma.billing_runs.upsert({
          where: {
            company_id_year_month: {
              company_id: row.company_id,
              year_month: periodStart
            }
          },
          update: {
            total_advance_principal: BigInt(row.total_advance_principal),
            rate_scaled: 0n,
            billing_fee: 0n,
            stripe_status: company.stripe_customer_id ? 'stripe_disabled' : 'missing_customer'
          },
          create: {
            company_id: row.company_id,
            year_month: periodStart,
            total_advance_principal: BigInt(row.total_advance_principal),
            rate_scaled: 0n,
            billing_fee: 0n,
            stripe_status: company.stripe_customer_id ? 'stripe_disabled' : 'missing_customer'
          }
        });

        results.push({
          companyId: record.company_id,
          yearMonth,
          totalAdvancePrincipal: record.total_advance_principal.toString(),
          rateScaled: record.rate_scaled.toString(),
          billingFee: record.billing_fee.toString(),
          recordedId: record.id,
          stripeInvoiceId: record.stripe_invoice_id ?? null,
          stripeStatus: record.stripe_status
        });
        continue;
      }

      const principal = BigInt(row.total_advance_principal);
      const rateScaled = resolveBillingRateScaled(principal);
      const fee = calculateBillingFee(principal);

      const record = await prisma.billing_runs.upsert({
        where: {
          company_id_year_month: {
            company_id: row.company_id,
            year_month: periodStart
          }
        },
        update: {
          total_advance_principal: principal,
          rate_scaled: rateScaled,
          billing_fee: fee
        },
        create: {
          company_id: row.company_id,
          year_month: periodStart,
          total_advance_principal: principal,
          rate_scaled: rateScaled,
          billing_fee: fee
        }
      });

      const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
      if (fee > maxSafe) {
        results.push({
          companyId: record.company_id,
          yearMonth,
          totalAdvancePrincipal: record.total_advance_principal.toString(),
          rateScaled: record.rate_scaled.toString(),
          billingFee: record.billing_fee.toString(),
          recordedId: record.id,
          stripeInvoiceId: record.stripe_invoice_id ?? null,
          stripeStatus: 'amount_too_large'
        });
        continue;
      }

      const description = `Driver Advance Accounting fee ${yearMonth}`;
      const invoiceItem = await stripe.invoiceItems.create({
        customer: company.stripe_customer_id,
        amount: Number(fee),
        currency: 'jpy',
        description,
        metadata: { year_month: yearMonth }
      });

      const invoice = await stripe.invoices.create({
        customer: company.stripe_customer_id,
        auto_advance: true,
        collection_method: 'charge_automatically',
        metadata: { year_month: yearMonth },
        description
      });

      const updated = await prisma.billing_runs.update({
        where: { id: record.id },
        data: {
          stripe_invoice_id: invoice.id,
          stripe_status: 'invoice_created'
        }
      });

      results.push({
        companyId: updated.company_id,
        yearMonth,
        totalAdvancePrincipal: updated.total_advance_principal.toString(),
        rateScaled: updated.rate_scaled.toString(),
        billingFee: updated.billing_fee.toString(),
        recordedId: updated.id,
        stripeInvoiceId: updated.stripe_invoice_id ?? null,
        stripeStatus: updated.stripe_status
      });
    }

    return { status: 200, body: { results } };
  };
};
