import { z } from 'zod';
import { prisma } from '../repositories/prisma/client';
import { jsonError } from './errors';

const CreateSchema = z.object({
  companyId: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  externalId: z.string().optional(),
  memo: z.string().optional()
});

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  externalId: z.string().optional(),
  memo: z.string().optional(),
  isActive: z.boolean().optional()
});

type HandlerInput = {
  driverId?: string;
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

export const createDriverHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = CreateSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const { companyId, name, email, externalId, memo } = parsed.data;
    const company = await prisma.companies.findUnique({ where: { id: companyId } });
    if (!company) return { status: 404, body: jsonError('company not found') };

    const existing = await prisma.drivers.findFirst({ where: { email } });
    if (existing) {
      if (!existing.is_active) {
        const restored = await prisma.drivers.update({
          where: { id: existing.id },
          data: {
            company_id: companyId,
            name,
            email,
            external_id: externalId ?? null,
            memo: memo ?? null,
            is_active: true,
            updated_at: new Date()
          }
        });
        return { status: 200, body: restored };
      }
      return { status: 409, body: jsonError('email already exists') };
    }

    const created = await prisma.drivers.create({
      data: {
        company_id: companyId,
        name,
        email,
        external_id: externalId ?? null,
        memo: memo ?? null,
        is_active: true
      }
    });

    return { status: 201, body: created };
  };
};

export const updateDriverHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    if (!input.driverId) return { status: 400, body: jsonError('driverId is required') };
    const parsed = UpdateSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const existing = await prisma.drivers.findUnique({ where: { id: input.driverId } });
    if (!existing) return { status: 404, body: jsonError('driver not found') };

    const update = parsed.data;
    if (update.email) {
      const emailOwner = await prisma.drivers.findFirst({ where: { email: update.email } });
      if (emailOwner && emailOwner.id !== existing.id) {
        return { status: 409, body: jsonError('email already exists') };
      }
    }

    const updated = await prisma.drivers.update({
      where: { id: existing.id },
      data: {
        name: update.name ?? existing.name,
        email: update.email ?? existing.email,
        external_id: update.externalId ?? existing.external_id,
        memo: update.memo ?? existing.memo,
        is_active: update.isActive ?? existing.is_active,
        updated_at: new Date()
      }
    });

    return { status: 200, body: updated };
  };
};

export const deleteDriverHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    if (!input.driverId) return { status: 400, body: jsonError('driverId is required') };
    const existing = await prisma.drivers.findUnique({ where: { id: input.driverId } });
    if (!existing) return { status: 404, body: jsonError('driver not found') };

    await prisma.drivers.update({
      where: { id: existing.id },
      data: { is_active: false, updated_at: new Date() }
    });

    return { status: 200, body: { success: true } };
  };
};
