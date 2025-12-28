-- payout settings for company

ALTER TABLE companies
  ADD COLUMN payout_day SMALLINT,
  ADD COLUMN payout_day_is_month_end BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN payout_offset_months SMALLINT NOT NULL DEFAULT 2;

ALTER TABLE companies
  ADD CONSTRAINT companies_payout_day_check
  CHECK (payout_day IS NULL OR payout_day IN (1,5,10,15,20,25));
