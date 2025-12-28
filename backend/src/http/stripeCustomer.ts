import { z } from 'zod';
import { prisma } from '../repositories/prisma/client';
import { getStripeClient } from '../integrations/stripeClient';
import { jsonError } from './errors';

const CreateCustomerSchema = z.object({
  companyId: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional()
});

type HandlerInput = {
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

export const createStripeCustomerHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = CreateCustomerSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const { companyId, name, email } = parsed.data;
    const company = await prisma.companies.findUnique({ where: { id: companyId } });
    if (!company) {
      return { status: 404, body: jsonError('company not found') };
    }

    if (company.stripe_customer_id) {
      return { status: 200, body: { stripeCustomerId: company.stripe_customer_id, status: 'already_exists' } };
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return { status: 503, body: jsonError('stripe not configured') };
    }

    const customer = await stripe.customers.create({
      name: name ?? company.name,
      email: email ?? undefined,
      metadata: { company_id: company.id }
    });

    await prisma.companies.update({
      where: { id: company.id },
      data: { stripe_customer_id: customer.id, updated_at: new Date() }
    });

    return { status: 201, body: { stripeCustomerId: customer.id, status: 'created' } };
  };
};
