import { randomUUID } from 'crypto';
import { z } from 'zod';
import { hashPassword } from '../domain/passwords';
import { prisma } from '../repositories/prisma/client';
import { Mailer, NoopMailer } from '../integrations/mailer';
import { jsonError } from './errors';

const InviteSchema = z.object({
  expiresInHours: z.number().int().positive().optional()
});

const AcceptSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1)
});

type InviteInput = {
  driverId?: string;
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

export const createDriverInviteHandler = (mailer: Mailer = new NoopMailer()) => {
  return async (input: InviteInput): Promise<HandlerResponse> => {
    if (!input.driverId) return { status: 400, body: jsonError('driverId is required') };
    const parsed = InviteSchema.safeParse(input.body ?? {});
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const driver = await prisma.drivers.findUnique({ where: { id: input.driverId } });
    if (!driver) return { status: 404, body: jsonError('driver not found') };
    if (!driver.email) return { status: 400, body: jsonError('driver email is required') };

    const existingUser = await prisma.users.findFirst({ where: { driver_id: driver.id } });
    if (existingUser) return { status: 409, body: jsonError('driver already has user') };

    const hours = parsed.data.expiresInHours ?? 72;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const token = randomUUID();

    const invitation = await prisma.driver_invitations.create({
      data: {
        company_id: driver.company_id,
        driver_id: driver.id,
        email: driver.email,
        token,
        expires_at: expiresAt
      }
    });

    try {
      await mailer.sendDriverInvite({ to: driver.email, inviteToken: token, expiresAt });
    } catch {
      // Delivery failures are not surfaced to avoid leaking account state.
    }

    return { status: 201, body: { invitationId: invitation.id, expiresAt } };
  };
};

export const createDriverInviteAcceptHandler = () => {
  return async (input: { body: unknown }): Promise<HandlerResponse> => {
    const parsed = AcceptSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const now = new Date();
    const invitation = await prisma.driver_invitations.findFirst({
      where: {
        token: parsed.data.token,
        used_at: null,
        expires_at: { gt: now }
      }
    });
    if (!invitation) return { status: 400, body: jsonError('invalid or expired token') };

    const driver = await prisma.drivers.findUnique({ where: { id: invitation.driver_id } });
    if (!driver) return { status: 404, body: jsonError('driver not found') };

    const existing = await prisma.users.findFirst({
      where: {
        OR: [{ email: invitation.email }, { driver_id: driver.id }]
      }
    });
    if (existing) return { status: 409, body: jsonError('user already exists') };

    const passwordHash = hashPassword(parsed.data.password);

    const [user] = await prisma.$transaction([
      prisma.users.create({
        data: {
          email: invitation.email,
          password_hash: passwordHash,
          role: 'driver',
          driver_id: driver.id,
          company_id: driver.company_id,
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
      }),
      prisma.driver_invitations.update({
        where: { id: invitation.id },
        data: { used_at: now }
      })
    ]);

    return { status: 201, body: user };
  };
};
