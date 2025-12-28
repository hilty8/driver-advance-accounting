-- Initial schema for driver advance accounting (v2 spec)
-- ledger_entries is the source of truth; driver_balances_materialized and metrics_monthly are recalculable caches.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  limit_rate NUMERIC(5,4) NOT NULL DEFAULT 0.8000,
  fee_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0500,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  bank_account JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_drivers_company ON drivers(company_id);

CREATE TABLE earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  work_month DATE NOT NULL,
  payout_month DATE NOT NULL,
  amount BIGINT NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL CHECK (status IN ('confirmed','paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_earnings_driver ON earnings(driver_id);
CREATE INDEX idx_earnings_company ON earnings(company_id);
CREATE INDEX idx_earnings_payout_month ON earnings(payout_month);

CREATE TABLE advances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  requested_amount BIGINT NOT NULL CHECK (requested_amount > 0),
  requested_at TIMESTAMPTZ NOT NULL,
  approved_amount BIGINT CHECK (approved_amount >= 0),
  fee_amount BIGINT CHECK (fee_amount >= 0),
  payout_amount BIGINT CHECK (payout_amount >= 0),
  payout_date DATE,
  status TEXT NOT NULL CHECK (status IN ('requested','rejected','approved','payout_instructed','paid','settling','settled','written_off')),
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_advances_driver ON advances(driver_id);
CREATE INDEX idx_advances_company ON advances(company_id);
CREATE INDEX idx_advances_status ON advances(status);

CREATE TABLE payrolls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  payout_date DATE NOT NULL,
  gross_salary_amount BIGINT NOT NULL CHECK (gross_salary_amount >= 0),
  advance_collection_amount BIGINT NOT NULL DEFAULT 0 CHECK (advance_collection_amount >= 0),
  net_salary_amount BIGINT CHECK (net_salary_amount >= 0),
  status TEXT NOT NULL CHECK (status IN ('planned','processed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payrolls_driver ON payrolls(driver_id);
CREATE INDEX idx_payrolls_company ON payrolls(company_id);
CREATE INDEX idx_payrolls_payout_date_status ON payrolls(payout_date, status);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  source_type TEXT NOT NULL CHECK (source_type IN ('advance','payroll','manual_adjustment','write_off')),
  source_id UUID NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('advance_principal','fee','collection','write_off')),
  amount BIGINT NOT NULL CHECK (amount >= 0),
  occurred_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ledger_driver ON ledger_entries(driver_id);
CREATE INDEX idx_ledger_company ON ledger_entries(company_id);
CREATE INDEX idx_ledger_entry_type ON ledger_entries(entry_type);
CREATE INDEX idx_ledger_occurred_on ON ledger_entries(occurred_on);

-- Cache: recalculable from ledger_entries (advance_principal/collection/write_off) and earnings.
CREATE TABLE driver_balances_materialized (
  driver_id UUID PRIMARY KEY REFERENCES drivers(id),
  company_id UUID REFERENCES companies(id),
  advance_balance BIGINT NOT NULL DEFAULT 0 CHECK (advance_balance >= 0),
  unpaid_confirmed_earnings BIGINT NOT NULL DEFAULT 0 CHECK (unpaid_confirmed_earnings >= 0),
  advance_limit BIGINT NOT NULL DEFAULT 0 CHECK (advance_limit >= 0),
  as_of_date DATE NOT NULL,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_driver_balances_company ON driver_balances_materialized(company_id);

-- Cache: recalculable monthly aggregates.
CREATE TABLE metrics_monthly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  year_month DATE NOT NULL,
  total_advance_principal BIGINT NOT NULL DEFAULT 0 CHECK (total_advance_principal >= 0),
  total_fee_revenue BIGINT NOT NULL DEFAULT 0 CHECK (total_fee_revenue >= 0),
  total_collected_principal BIGINT NOT NULL DEFAULT 0 CHECK (total_collected_principal >= 0),
  total_written_off_principal BIGINT NOT NULL DEFAULT 0 CHECK (total_written_off_principal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, year_month)
);
CREATE INDEX idx_metrics_company ON metrics_monthly(company_id);
CREATE INDEX idx_metrics_year_month ON metrics_monthly(year_month);

