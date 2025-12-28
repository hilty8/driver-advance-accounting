-- billing_runs for monthly billing preview/run tracking

CREATE TABLE billing_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  year_month DATE NOT NULL,
  total_advance_principal BIGINT NOT NULL CHECK (total_advance_principal >= 0),
  rate_scaled BIGINT NOT NULL CHECK (rate_scaled >= 0),
  billing_fee BIGINT NOT NULL CHECK (billing_fee >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, year_month)
);

CREATE INDEX idx_billing_runs_company ON billing_runs(company_id);
CREATE INDEX idx_billing_runs_year_month ON billing_runs(year_month);
