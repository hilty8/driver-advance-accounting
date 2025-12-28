import { z } from 'zod';
import { hashPassword } from '../domain/passwords';
import { prisma } from '../repositories/prisma/client';
import { jsonError } from './errors';

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['admin', 'operator', 'company', 'driver']),
  companyId: z.string().optional(),
  driverId: z.string().optional()
}).superRefine((value, ctx) => {
  if (value.role === 'company' && !value.companyId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'companyId is required', path: ['companyId'] });
  }
  if (value.role === 'driver' && !value.driverId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'driverId is required', path: ['driverId'] });
  }
  if ((value.role === 'admin' || value.role === 'operator') && (value.companyId || value.driverId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'companyId/driverId not allowed for this role', path: ['role'] });
  }
});

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
  role: z.enum(['admin', 'operator', 'company', 'driver']).optional(),
  companyId: z.string().optional(),
  driverId: z.string().optional(),
  isActive: z.boolean().optional()
}).superRefine((value, ctx) => {
  if (value.role === 'company' && !value.companyId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'companyId is required', path: ['companyId'] });
  }
  if (value.role === 'driver' && !value.driverId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'driverId is required', path: ['driverId'] });
  }
  if ((value.role === 'admin' || value.role === 'operator') && (value.companyId || value.driverId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'companyId/driverId not allowed for this role', path: ['role'] });
  }
});

type HandlerInput = {
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

export const createUserHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = CreateUserSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const { email, password, role, companyId, driverId } = parsed.data;
    const existing = await prisma.users.findFirst({ where: { email } });
    if (existing) {
      return { status: 409, body: jsonError('email already exists') };
    }

    if (companyId) {
      const company = await prisma.companies.findUnique({ where: { id: companyId } });
      if (!company) return { status: 404, body: jsonError('company not found') };
    }
    if (driverId) {
      const driver = await prisma.drivers.findUnique({ where: { id: driverId } });
      if (!driver) return { status: 404, body: jsonError('driver not found') };
    }

    const created = await prisma.users.create({
      data: {
        email,
        password_hash: hashPassword(password),
        role,
        company_id: companyId ?? null,
        driver_id: driverId ?? null,
        is_active: true
      },
      select: {
        id: true,
        email: true,
        role: true,
        company_id: true,
        driver_id: true,
        is_active: true,
        created_at: true,
        updated_at: true
      }
    });

    return { status: 201, body: created };
  };
};

export const listUsersHandler = () => {
  return async (input: { query: Record<string, string | undefined> }): Promise<HandlerResponse> => {
    const role = input.query.role;
    const companyId = input.query.companyId;
    const driverId = input.query.driverId;
    const isActive = input.query.isActive;

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (companyId) where.company_id = companyId;
    if (driverId) where.driver_id = driverId;
    if (isActive !== undefined) where.is_active = isActive === 'true';

    const users = await prisma.users.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        company_id: true,
        driver_id: true,
        is_active: true,
        created_at: true,
        updated_at: true
      },
      orderBy: { created_at: 'desc' }
    });

    return { status: 200, body: { users } };
  };
};

export const updateUserHandler = () => {
  return async (input: { userId?: string; body: unknown }): Promise<HandlerResponse> => {
    if (!input.userId) return { status: 400, body: jsonError('userId is required') };
    const parsed = UpdateUserSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const existing = await prisma.users.findUnique({ where: { id: input.userId } });
    if (!existing) return { status: 404, body: jsonError('user not found') };

    if (parsed.data.email) {
      const emailOwner = await prisma.users.findFirst({ where: { email: parsed.data.email } });
      if (emailOwner && emailOwner.id !== existing.id) {
        return { status: 409, body: jsonError('email already exists') };
      }
    }

    if (parsed.data.companyId) {
      const company = await prisma.companies.findUnique({ where: { id: parsed.data.companyId } });
      if (!company) return { status: 404, body: jsonError('company not found') };
    }
    if (parsed.data.driverId) {
      const driver = await prisma.drivers.findUnique({ where: { id: parsed.data.driverId } });
      if (!driver) return { status: 404, body: jsonError('driver not found') };
    }

    const updated = await prisma.users.update({
      where: { id: existing.id },
      data: {
        email: parsed.data.email ?? existing.email,
        password_hash: parsed.data.password ? hashPassword(parsed.data.password) : existing.password_hash,
        role: parsed.data.role ?? existing.role,
        company_id: parsed.data.companyId ?? existing.company_id,
        driver_id: parsed.data.driverId ?? existing.driver_id,
        is_active: parsed.data.isActive ?? existing.is_active,
        updated_at: new Date()
      },
      select: {
        id: true,
        email: true,
        role: true,
        company_id: true,
        driver_id: true,
        is_active: true,
        created_at: true,
        updated_at: true
      }
    });

    return { status: 200, body: updated };
  };
};

export const deleteUserHandler = () => {
  return async (input: { userId?: string }): Promise<HandlerResponse> => {
    if (!input.userId) return { status: 400, body: jsonError('userId is required') };
    const existing = await prisma.users.findUnique({ where: { id: input.userId } });
    if (!existing) return { status: 404, body: jsonError('user not found') };

    const updated = await prisma.users.update({
      where: { id: existing.id },
      data: { is_active: false, updated_at: new Date() },
      select: {
        id: true,
        email: true,
        role: true,
        company_id: true,
        driver_id: true,
        is_active: true,
        created_at: true,
        updated_at: true
      }
    });

    return { status: 200, body: updated };
  };
};
