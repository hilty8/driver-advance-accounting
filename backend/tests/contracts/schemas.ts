import { z } from 'zod';

export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.unknown().optional()
});

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: z.string(),
    companyId: z.string().nullable().optional(),
    driverId: z.string().nullable().optional()
  })
});

export const DriverSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
  external_id: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  is_active: z.boolean()
});

export const AdvanceSchema = z.object({
  id: z.string(),
  driverId: z.string(),
  companyId: z.string(),
  requestedAmount: z.string(),
  status: z.string()
}).passthrough();

export const PayrollSchema = z.object({
  id: z.string(),
  driver_id: z.string(),
  company_id: z.string(),
  payout_date: z.any(),
  status: z.string()
}).passthrough();
