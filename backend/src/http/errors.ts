export type ErrorResponse = {
  error: string;
  details?: unknown;
};

export const jsonError = (error: string, details?: unknown): ErrorResponse => {
  if (details === undefined) return { error };
  return { error, details };
};
