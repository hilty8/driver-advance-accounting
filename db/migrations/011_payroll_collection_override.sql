ALTER TABLE payrolls
ADD COLUMN collection_override_amount BIGINT,
ADD COLUMN collection_override_reason TEXT;
