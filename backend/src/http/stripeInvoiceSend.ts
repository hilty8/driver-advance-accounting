import { z } from 'zod';
import { prisma } from '../repositories/prisma/client';
import { getStripeClient } from '../integrations/stripeClient';
import { jsonError } from './errors';

const SendSchema = z.object({
  billingRunId: z.string()
});

type HandlerInput = {
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

export const createStripeInvoiceSendHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = SendSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return { status: 503, body: jsonError('stripe not configured') };
    }

    const run = await prisma.billing_runs.findUnique({ where: { id: parsed.data.billingRunId } });
    if (!run) {
      return { status: 404, body: jsonError('billing_run not found') };
    }

    if (!run.stripe_invoice_id) {
      return { status: 400, body: jsonError('stripe_invoice_id is missing') };
    }

    const invoice = await stripe.invoices.sendInvoice(run.stripe_invoice_id);

    const updated = await prisma.billing_runs.update({
      where: { id: run.id },
      data: { stripe_status: invoice.status ?? 'sent' }
    });

    return { status: 200, body: { invoiceId: invoice.id, status: updated.stripe_status } };
  };
};
