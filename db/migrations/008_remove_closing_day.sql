-- Remove closing day settings

ALTER TABLE companies
  DROP COLUMN IF EXISTS closing_day,
  DROP COLUMN IF EXISTS closing_day_is_month_end;

ALTER TABLE companies
  DROP CONSTRAINT IF EXISTS companies_closing_day_check;
