CREATE TABLE driver_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_driver_invitations_company ON driver_invitations(company_id);
CREATE INDEX idx_driver_invitations_driver ON driver_invitations(driver_id);
CREATE INDEX idx_driver_invitations_expires_at ON driver_invitations(expires_at);
