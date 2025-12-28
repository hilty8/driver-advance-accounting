-- Stripe related fields for billing and companies

ALTER TABLE companies
  ADD COLUMN stripe_customer_id TEXT;

ALTER TABLE billing_runs
  ADD COLUMN stripe_invoice_id TEXT,
  ADD COLUMN stripe_status TEXT NOT NULL DEFAULT 'pending';

CREATE INDEX idx_companies_stripe_customer_id ON companies(stripe_customer_id);
