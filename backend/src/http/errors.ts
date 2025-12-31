export type ErrorResponse = {
  error: string;
  details?: unknown;
  requestId?: string;
};

export const jsonError = (error: string, details?: unknown): ErrorResponse => {
  if (details === undefined) return { error };
  return { error, details };
};
