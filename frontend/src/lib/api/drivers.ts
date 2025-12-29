import { apiFetch } from '@/lib/api/client';

export type DriverResponse = {
  id: string;
  company_id: string;
  name: string;
  email?: string | null;
  external_id?: string | null;
  memo?: string | null;
  is_active?: boolean;
};

export const createDriver = (payload: { companyId: string; name: string; email: string }) =>
  apiFetch<DriverResponse>('/drivers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const inviteDriver = (driverId: string, expiresInHours?: number) =>
  apiFetch<{ invitationId: string; expiresAt: string }>(`/drivers/${driverId}/invite`, {
    method: 'POST',
    body: JSON.stringify(expiresInHours ? { expiresInHours } : {})
  });
