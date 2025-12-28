import type { components } from '@/lib/types/openapi';
import { apiFetch } from '@/lib/api/client';

export type LoginResponse = components['schemas']['LoginResponse'];

export const login = (email: string, password: string) =>
  apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
