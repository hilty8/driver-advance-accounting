-- CreateEnum
CREATE TYPE "AdvanceAuditAction" AS ENUM ('approved', 'rejected');

-- CreateTable
CREATE TABLE "advance_audit_logs" (
    "id" UUID NOT NULL,
    "advance_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" "AdvanceAuditAction" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advance_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "advance_audit_logs_advance_id_idx" ON "advance_audit_logs"("advance_id");

-- CreateIndex
CREATE INDEX "advance_audit_logs_company_id_idx" ON "advance_audit_logs"("company_id");

-- CreateIndex
CREATE INDEX "advance_audit_logs_driver_id_idx" ON "advance_audit_logs"("driver_id");

-- CreateIndex
CREATE INDEX "advance_audit_logs_actor_user_id_idx" ON "advance_audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "advance_audit_logs_action_idx" ON "advance_audit_logs"("action");

-- AddForeignKey
ALTER TABLE "advance_audit_logs" ADD CONSTRAINT "advance_audit_logs_advance_id_fkey" FOREIGN KEY ("advance_id") REFERENCES "advances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_audit_logs" ADD CONSTRAINT "advance_audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_audit_logs" ADD CONSTRAINT "advance_audit_logs_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_audit_logs" ADD CONSTRAINT "advance_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
