import { clearSession, getToken } from '@/lib/auth/session';

export type ApiErrorPayload = {
  status: number;
  error: string;
  details?: unknown;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const normalizeError = (status: number, body: unknown): ApiErrorPayload => {
  if (body && typeof body === 'object' && 'error' in body) {
    const errorBody = body as { error?: unknown; details?: unknown };
    return {
      status,
      error: typeof errorBody.error === 'string' ? errorBody.error : 'request failed',
      details: errorBody.details
    };
  }
  return { status, error: 'request failed' };
};

export const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers ?? {});
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store'
  });

  const body = await parseBody(response);
  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }
    throw normalizeError(response.status, body);
  }

  return body as T;
};
