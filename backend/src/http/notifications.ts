import { z } from 'zod';
import { prisma } from '../repositories/prisma/client';
import { jsonError } from './errors';

const ListSchema = z.object({
  recipientType: z.enum(['company', 'driver', 'operator']),
  recipientId: z.string().optional(),
  unreadOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional()
});

const MarkReadSchema = z.object({
  recipientType: z.enum(['company', 'driver', 'operator']),
  recipientId: z.string().nullable().optional()
});

type HandlerInput = {
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

export const createNotificationsListHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = ListSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const { recipientType, recipientId, unreadOnly, limit = 50, offset = 0 } = parsed.data;
    const where: {
      recipient_type: string;
      recipient_id?: string | null;
      is_read?: boolean;
    } = { recipient_type: recipientType };

    if (recipientType !== 'operator') {
      if (!recipientId) {
        return { status: 400, body: jsonError('recipientId is required') };
      }
      where.recipient_id = recipientId;
    } else {
      where.recipient_id = null;
    }

    if (unreadOnly) where.is_read = false;

    const rows = await prisma.notifications.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit
    });

    const cleanupWhere: { recipient_type: string; recipient_id?: string | null } = {
      recipient_type: where.recipient_type
    };
    if (where.recipient_id !== undefined) cleanupWhere.recipient_id = where.recipient_id;

    const stale = await prisma.notifications.findMany({
      where: cleanupWhere,
      orderBy: { created_at: 'desc' },
      skip: 50,
      select: { id: true }
    });
    if (stale.length > 0) {
      await prisma.notifications.deleteMany({
        where: { id: { in: stale.map((row) => row.id) } }
      });
    }

    return { status: 200, body: { notifications: rows } };
  };
};

export const createNotificationsMarkAllReadHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = MarkReadSchema.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    const { recipientType, recipientId } = parsed.data;
    const where: { recipient_type: string; recipient_id?: string | null; is_read: boolean } = {
      recipient_type: recipientType,
      is_read: false
    };

    if (recipientType !== 'operator') {
      if (!recipientId) {
        return { status: 400, body: jsonError('recipientId is required') };
      }
      where.recipient_id = recipientId;
    } else {
      where.recipient_id = null;
    }

    const result = await prisma.notifications.updateMany({
      where,
      data: { is_read: true, read_at: new Date() }
    });

    return { status: 200, body: { updated: result.count } };
  };
};
