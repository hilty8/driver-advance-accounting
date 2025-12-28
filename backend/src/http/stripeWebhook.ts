import { prisma } from '../repositories/prisma/client';
import { getStripeClient } from '../integrations/stripeClient';

const readRawBody = async (req: import('http').IncomingMessage): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

type HandlerResponse = {
  status: number;
  body: string;
};

export const handleStripeWebhook = async (req: import('http').IncomingMessage): Promise<HandlerResponse> => {
  const stripe = getStripeClient();
  if (!stripe) {
    return { status: 503, body: 'stripe not configured' };
  }

  const signature = req.headers['stripe-signature'];
  if (!signature || Array.isArray(signature)) {
    return { status: 400, body: 'missing stripe-signature' };
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return { status: 503, body: 'webhook secret missing' };
  }

  const rawBody = await readRawBody(req);
  let event: import('stripe').Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return { status: 400, body: `invalid signature: ${(error as Error).message}` };
  }

  if (
    event.type === 'invoice.finalized' ||
    event.type === 'invoice.paid' ||
    event.type === 'invoice.payment_failed' ||
    event.type === 'invoice.voided' ||
    event.type === 'charge.refunded'
  ) {
    const invoice = event.data.object as import('stripe').Stripe.Invoice;
    const status = invoice.status ?? event.type;

    await prisma.billing_runs.updateMany({
      where: { stripe_invoice_id: invoice.id },
      data: { stripe_status: status }
    });

    if (event.type === 'invoice.payment_failed') {
      await prisma.notifications.create({
        data: {
          recipient_type: 'operator',
          recipient_id: null,
          category: 'billing',
          severity: 'critical',
          title: 'Stripe 請求の決済失敗',
          message: `Invoice ${invoice.id} の決済に失敗しました。`,
          source_type: 'stripe_invoice',
          source_id: null,
          is_read: false
        }
      });

      const run = await prisma.billing_runs.findFirst({
        where: { stripe_invoice_id: invoice.id }
      });
      if (run) {
        await prisma.notifications.create({
          data: {
            recipient_type: 'company',
            recipient_id: run.company_id,
            category: 'billing',
            severity: 'critical',
            title: 'Stripe 請求の決済失敗',
            message: `Invoice ${invoice.id} の決済に失敗しました。`,
            source_type: 'stripe_invoice',
            source_id: null,
            is_read: false
          }
        });
      }
    }
    if (event.type === 'invoice.paid') {
      const run = await prisma.billing_runs.findFirst({
        where: { stripe_invoice_id: invoice.id }
      });
      if (run) {
        await prisma.notifications.create({
          data: {
            recipient_type: 'company',
            recipient_id: run.company_id,
            category: 'billing',
            severity: 'info',
            title: 'Stripe 請求の支払い完了',
            message: `Invoice ${invoice.id} の支払いが完了しました。`,
            source_type: 'stripe_invoice',
            source_id: null,
            is_read: false
          }
        });
      }
    }
    if (event.type === 'invoice.voided') {
      await prisma.notifications.create({
        data: {
          recipient_type: 'operator',
          recipient_id: null,
          category: 'billing',
          severity: 'warning',
          title: 'Stripe 請求の無効化',
          message: `Invoice ${invoice.id} が無効化されました。`,
          source_type: 'stripe_invoice',
          source_id: null,
          is_read: false
        }
      });
    }
    if (event.type === 'charge.refunded') {
      const charge = event.data.object as import('stripe').Stripe.Charge;
      const invoiceValue = (charge as { invoice?: unknown }).invoice;
      const invoiceId = typeof invoiceValue === 'string' ? invoiceValue : null;
      const message = invoiceId
        ? `Invoice ${invoiceId} に紐づく返金が発生しました。`
        : 'Stripe 返金が発生しました（Invoice情報なし）。';

      if (invoiceId) {
        await prisma.billing_runs.updateMany({
          where: { stripe_invoice_id: invoiceId },
          data: { stripe_status: 'refunded' }
        });
      }

      await prisma.notifications.create({
        data: {
          recipient_type: 'operator',
          recipient_id: null,
          category: 'billing',
          severity: 'warning',
          title: 'Stripe 返金が発生',
          message,
          source_type: 'stripe_invoice',
          source_id: invoiceId ?? null,
          is_read: false
        }
      });
    }
  }

  return { status: 200, body: 'ok' };
};
