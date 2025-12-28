-- CreateEnum
CREATE TYPE "EarningStatus" AS ENUM ('confirmed', 'paid');

-- CreateEnum
CREATE TYPE "AdvanceStatus" AS ENUM ('requested', 'rejected', 'approved', 'payout_instructed', 'paid', 'settling', 'settled', 'written_off');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('planned', 'processed');

-- CreateEnum
CREATE TYPE "LedgerSourceType" AS ENUM ('advance', 'payroll', 'manual_adjustment', 'write_off');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('advance_principal', 'fee', 'collection', 'write_off');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'operator', 'company', 'driver');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "limit_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.8,
    "fee_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.05,
    "payout_day" SMALLINT,
    "payout_day_is_month_end" BOOLEAN NOT NULL DEFAULT false,
    "payout_offset_months" SMALLINT NOT NULL DEFAULT 2,
    "allow_advance_over_salary" BOOLEAN NOT NULL DEFAULT false,
    "stripe_customer_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "memo" TEXT,
    "bank_account" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earnings" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "work_month" DATE NOT NULL,
    "payout_month" DATE NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "EarningStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advances" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "requested_amount" BIGINT NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "approved_amount" BIGINT,
    "fee_amount" BIGINT,
    "payout_amount" BIGINT,
    "payout_date" DATE,
    "status" "AdvanceStatus" NOT NULL,
    "memo" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "payout_date" DATE NOT NULL,
    "gross_salary_amount" BIGINT NOT NULL,
    "advance_collection_amount" BIGINT NOT NULL DEFAULT 0,
    "collection_override_amount" BIGINT,
    "collection_override_reason" TEXT,
    "net_salary_amount" BIGINT,
    "status" "PayrollStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "source_type" "LedgerSourceType" NOT NULL,
    "source_id" UUID NOT NULL,
    "entry_type" "LedgerEntryType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "occurred_on" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_balances_materialized" (
    "driver_id" UUID NOT NULL,
    "company_id" UUID,
    "advance_balance" BIGINT NOT NULL DEFAULT 0,
    "unpaid_confirmed_earnings" BIGINT NOT NULL DEFAULT 0,
    "advance_limit" BIGINT NOT NULL DEFAULT 0,
    "as_of_date" DATE NOT NULL,
    "refreshed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_balances_materialized_pkey" PRIMARY KEY ("driver_id")
);

-- CreateTable
CREATE TABLE "metrics_monthly" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "year_month" DATE NOT NULL,
    "total_advance_principal" BIGINT NOT NULL DEFAULT 0,
    "total_fee_revenue" BIGINT NOT NULL DEFAULT 0,
    "total_collected_principal" BIGINT NOT NULL DEFAULT 0,
    "total_written_off_principal" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metrics_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "company_id" UUID,
    "driver_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_invitations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_runs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "year_month" DATE NOT NULL,
    "total_advance_principal" BIGINT NOT NULL,
    "rate_scaled" BIGINT NOT NULL,
    "billing_fee" BIGINT NOT NULL,
    "stripe_invoice_id" TEXT,
    "stripe_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_type" TEXT NOT NULL,
    "recipient_id" UUID,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source_type" TEXT,
    "source_id" UUID,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_external_id_key" ON "drivers"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_email_key" ON "drivers"("email");

-- CreateIndex
CREATE INDEX "earnings_driver_id_idx" ON "earnings"("driver_id");

-- CreateIndex
CREATE INDEX "earnings_company_id_idx" ON "earnings"("company_id");

-- CreateIndex
CREATE INDEX "earnings_payout_month_idx" ON "earnings"("payout_month");

-- CreateIndex
CREATE INDEX "advances_driver_id_idx" ON "advances"("driver_id");

-- CreateIndex
CREATE INDEX "advances_company_id_idx" ON "advances"("company_id");

-- CreateIndex
CREATE INDEX "advances_status_idx" ON "advances"("status");

-- CreateIndex
CREATE INDEX "payrolls_driver_id_idx" ON "payrolls"("driver_id");

-- CreateIndex
CREATE INDEX "payrolls_company_id_idx" ON "payrolls"("company_id");

-- CreateIndex
CREATE INDEX "payrolls_payout_date_status_idx" ON "payrolls"("payout_date", "status");

-- CreateIndex
CREATE INDEX "ledger_entries_driver_id_idx" ON "ledger_entries"("driver_id");

-- CreateIndex
CREATE INDEX "ledger_entries_company_id_idx" ON "ledger_entries"("company_id");

-- CreateIndex
CREATE INDEX "ledger_entries_entry_type_idx" ON "ledger_entries"("entry_type");

-- CreateIndex
CREATE INDEX "ledger_entries_occurred_on_idx" ON "ledger_entries"("occurred_on");

-- CreateIndex
CREATE INDEX "driver_balances_materialized_company_id_idx" ON "driver_balances_materialized"("company_id");

-- CreateIndex
CREATE INDEX "metrics_monthly_company_id_idx" ON "metrics_monthly"("company_id");

-- CreateIndex
CREATE INDEX "metrics_monthly_year_month_idx" ON "metrics_monthly"("year_month");

-- CreateIndex
CREATE UNIQUE INDEX "metrics_monthly_company_id_year_month_key" ON "metrics_monthly"("company_id", "year_month");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE INDEX "users_driver_id_idx" ON "users"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_invitations_token_key" ON "driver_invitations"("token");

-- CreateIndex
CREATE INDEX "driver_invitations_company_id_idx" ON "driver_invitations"("company_id");

-- CreateIndex
CREATE INDEX "driver_invitations_driver_id_idx" ON "driver_invitations"("driver_id");

-- CreateIndex
CREATE INDEX "driver_invitations_expires_at_idx" ON "driver_invitations"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "billing_runs_company_id_idx" ON "billing_runs"("company_id");

-- CreateIndex
CREATE INDEX "billing_runs_year_month_idx" ON "billing_runs"("year_month");

-- CreateIndex
CREATE UNIQUE INDEX "billing_runs_company_id_year_month_key" ON "billing_runs"("company_id", "year_month");

-- CreateIndex
CREATE INDEX "notifications_recipient_type_recipient_id_idx" ON "notifications"("recipient_type", "recipient_id");

-- CreateIndex
CREATE INDEX "notifications_category_idx" ON "notifications"("category");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advances" ADD CONSTRAINT "advances_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advances" ADD CONSTRAINT "advances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_balances_materialized" ADD CONSTRAINT "driver_balances_materialized_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_balances_materialized" ADD CONSTRAINT "driver_balances_materialized_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics_monthly" ADD CONSTRAINT "metrics_monthly_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_invitations" ADD CONSTRAINT "driver_invitations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_invitations" ADD CONSTRAINT "driver_invitations_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_runs" ADD CONSTRAINT "billing_runs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

