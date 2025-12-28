import { randomUUID } from 'crypto';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../domain/passwords';
import { prisma } from '../repositories/prisma/client';
import { Mailer, NoopMailer } from '../integrations/mailer';
import { jsonError } from './errors';
import jwt from 'jsonwebtoken';

const EmailSchema = z.object({
  email: z.string().email()
});

const PasswordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(1)
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

type HandlerInput = {
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

export const createPasswordResetHandler = (mailer: Mailer = new NoopMailer()) => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = EmailSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const { email } = parsed.data;
    const user = await prisma.users.findFirst({ where: { email, is_active: true } });

    if (user) {
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await prisma.password_reset_tokens.create({
        data: {
          user_id: user.id,
          token,
          expires_at: expiresAt
        }
      });
      try {
        await mailer.sendPasswordReset({ to: email, resetToken: token, expiresAt });
      } catch {
        // Hide delivery failures to avoid user enumeration.
      }
    }

    return { status: 202, body: { success: true } };
  };
};

export const createIdRemindHandler = (mailer: Mailer = new NoopMailer()) => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = EmailSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const { email } = parsed.data;
    const user = await prisma.users.findFirst({ where: { email, is_active: true } });
    if (user) {
      try {
        await mailer.sendIdReminder({ to: email });
      } catch {
        // Hide delivery failures to avoid user enumeration.
      }
    }

    return { status: 202, body: { success: true } };
  };
};

export const createPasswordResetConfirmHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = PasswordResetConfirmSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const { token, newPassword } = parsed.data;
    const now = new Date();
    const resetToken = await prisma.password_reset_tokens.findFirst({
      where: {
        token,
        used_at: null,
        expires_at: { gt: now }
      },
      include: { user: true }
    });

    if (!resetToken || !resetToken.user.is_active) {
      return { status: 400, body: jsonError('invalid or expired token') };
    }

    const passwordHash = hashPassword(newPassword);

    await prisma.$transaction([
      prisma.users.update({
        where: { id: resetToken.user_id },
        data: { password_hash: passwordHash, updated_at: now }
      }),
      prisma.password_reset_tokens.update({
        where: { id: resetToken.id },
        data: { used_at: now }
      })
    ]);

    return { status: 200, body: { success: true } };
  };
};

export const createLoginHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = LoginSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return { status: 503, body: jsonError('auth not configured') };
    }

    const { email, password } = parsed.data;
    const user = await prisma.users.findFirst({ where: { email, is_active: true } });
    if (!user || !verifyPassword(password, user.password_hash)) {
      return { status: 401, body: jsonError('invalid credentials') };
    }

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        companyId: user.company_id,
        driverId: user.driver_id
      },
      secret,
      { expiresIn: '8h' }
    );

    return {
      status: 200,
      body: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          companyId: user.company_id,
          driverId: user.driver_id
        }
      }
    };
  };
};
