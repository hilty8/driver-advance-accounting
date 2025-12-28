-- Add external_id to drivers for CSV mapping

ALTER TABLE drivers
  ADD COLUMN external_id TEXT UNIQUE;

CREATE INDEX idx_drivers_external_id ON drivers(external_id);
