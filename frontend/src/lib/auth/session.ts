import type { components } from '@/lib/types/openapi';

export type StoredSession = {
  token: string;
  user: components['schemas']['LoginResponse']['user'];
};

const STORAGE_KEY = 'driver-advance-accounting.session';

export const getSession = (): StoredSession | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
};

export const setSession = (session: StoredSession) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const clearSession = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const getToken = (): string | null => getSession()?.token ?? null;
