import type { components } from '@/lib/types/openapi';
import { apiFetch } from '@/lib/api/client';

export type Advance = components['schemas']['Advance'];
export type AdvanceAvailability = {
  availableAmount: string;
  deductedAmount: string;
};

export const createAdvance = (driverId: string, amount: string) =>
  apiFetch<Advance>(`/drivers/${driverId}/advances`, {
    method: 'POST',
    body: JSON.stringify({ amount })
  });

export const listCompanyAdvances = (companyId: string) =>
  apiFetch<Advance[]>(`/companies/${companyId}/advances`, {
    method: 'GET'
  });

export const getAdvanceAvailability = (driverId: string) =>
  apiFetch<AdvanceAvailability>(`/drivers/${driverId}/advance-availability`, {
    method: 'GET'
  });

export const approveAdvance = (advanceId: string, approvedAt: string) =>
  apiFetch<Advance>(`/advances/${advanceId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approvedAt })
  });

export const rejectAdvance = (advanceId: string, reason: string) =>
  apiFetch<Advance>(`/advances/${advanceId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
