import { apiFetch } from '@/lib/api/client';

export type InviteAcceptResponse = {
  id: string;
  email: string;
  role: string;
};

export const acceptDriverInvite = (token: string, password: string) =>
  apiFetch<InviteAcceptResponse>('/driver-invitations/accept', {
    method: 'POST',
    body: JSON.stringify({ token, password })
  });
