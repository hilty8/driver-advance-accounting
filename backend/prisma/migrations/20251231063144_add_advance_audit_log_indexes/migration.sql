-- CreateIndex
CREATE INDEX "advance_audit_logs_created_at_idx" ON "advance_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "advance_audit_logs_company_id_created_at_idx" ON "advance_audit_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "advance_audit_logs_driver_id_created_at_idx" ON "advance_audit_logs"("driver_id", "created_at");
