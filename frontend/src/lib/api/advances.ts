import type { components } from '@/lib/types/openapi';
import { apiFetch } from '@/lib/api/client';

export type Advance = components['schemas']['Advance'];

export const createAdvance = (driverId: string, amount: string) =>
  apiFetch<Advance>(`/drivers/${driverId}/advances`, {
    method: 'POST',
    body: JSON.stringify({ amount })
  });
