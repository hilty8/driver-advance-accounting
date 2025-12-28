import Stripe from 'stripe';

let cached: Stripe | null = null;

export const getStripeClient = (): Stripe | null => {
  if (cached) return cached;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) return null;

  cached = new Stripe(apiKey, { apiVersion: '2024-04-10' as Stripe.LatestApiVersion });
  return cached;
};
