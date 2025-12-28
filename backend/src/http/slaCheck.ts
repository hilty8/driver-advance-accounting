import { z } from 'zod';
import { prisma } from '../repositories/prisma/client';
import { jsonError } from './errors';

const SLA_SCHEMA = z.object({
  asOf: z.string().optional()
});

type HandlerInput = {
  body: unknown;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

const parseAsOf = (value?: string): Date => {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error('invalid asOf');
  return parsed;
};

const createNotificationIfMissing = async (params: {
  recipientType: string;
  recipientId: string | null;
  category: string;
  severity: string;
  title: string;
  message: string;
  sourceType: string;
  sourceId: string;
}) => {
  const exists = await prisma.notifications.findFirst({
    where: {
      recipient_type: params.recipientType,
      recipient_id: params.recipientId ?? null,
      category: params.category,
      severity: params.severity,
      source_type: params.sourceType,
      source_id: params.sourceId
    }
  });

  if (exists) return null;

  return prisma.notifications.create({
    data: {
      recipient_type: params.recipientType,
      recipient_id: params.recipientId,
      category: params.category,
      severity: params.severity,
      title: params.title,
      message: params.message,
      source_type: params.sourceType,
      source_id: params.sourceId,
      is_read: false
    }
  });
};

export const createSlaCheckHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const parsed = SLA_SCHEMA.safeParse(input.body);
    if (!parsed.success) {
      return { status: 400, body: jsonError('invalid payload', parsed.error.flatten()) };
    }

    let asOf: Date;
    try {
      asOf = parseAsOf(parsed.data.asOf);
    } catch (error) {
      return { status: 400, body: jsonError((error as Error).message) };
    }

    const warnMinutes = 150; // 30 minutes before 3 hours
    const dueMinutes = 180;  // due at 3 hours
    const overdueMinutes = 360; // escalation after 6 hours

    const warnAt = new Date(asOf.getTime() - warnMinutes * 60 * 1000);
    const dueAt = new Date(asOf.getTime() - dueMinutes * 60 * 1000);
    const overdueAt = new Date(asOf.getTime() - overdueMinutes * 60 * 1000);

    const pending = await prisma.advances.findMany({
      where: { status: 'requested' }
    });

    let created = 0;

    for (const advance of pending) {
      if (advance.requested_at <= overdueAt) {
        const createdRow = await createNotificationIfMissing({
          recipientType: 'company',
          recipientId: advance.company_id,
          category: 'sla',
          severity: 'critical',
          title: '前借り申請が長時間未処理',
          message: `申請 ${advance.id} が SLA 超過しています。`,
          sourceType: 'advance',
          sourceId: advance.id
        });
        if (createdRow) created += 1;
      } else if (advance.requested_at <= dueAt) {
        const createdRow = await createNotificationIfMissing({
          recipientType: 'company',
          recipientId: advance.company_id,
          category: 'sla',
          severity: 'warning',
          title: '前借り申請の対応期限到達',
          message: `申請 ${advance.id} の対応期限に到達しました。`,
          sourceType: 'advance',
          sourceId: advance.id
        });
        if (createdRow) created += 1;
      } else if (advance.requested_at <= warnAt) {
        const createdRow = await createNotificationIfMissing({
          recipientType: 'company',
          recipientId: advance.company_id,
          category: 'sla',
          severity: 'info',
          title: '前借り申請の対応期限が近づいています',
          message: `申請 ${advance.id} の対応期限が近づいています。`,
          sourceType: 'advance',
          sourceId: advance.id
        });
        if (createdRow) created += 1;
      }
    }

    const awaitingPayout = await prisma.advances.findMany({
      where: { status: 'approved' }
    });

    for (const advance of awaitingPayout) {
      if (advance.updated_at <= overdueAt) {
        const createdRow = await createNotificationIfMissing({
          recipientType: 'company',
          recipientId: advance.company_id,
          category: 'sla',
          severity: 'critical',
          title: '前借り振込が長時間未完了',
          message: `承認済み ${advance.id} の振込が遅延しています。`,
          sourceType: 'advance',
          sourceId: advance.id
        });
        if (createdRow) created += 1;
      } else if (advance.updated_at <= dueAt) {
        const createdRow = await createNotificationIfMissing({
          recipientType: 'company',
          recipientId: advance.company_id,
          category: 'sla',
          severity: 'warning',
          title: '前借り振込の対応期限到達',
          message: `承認済み ${advance.id} の振込期限に到達しました。`,
          sourceType: 'advance',
          sourceId: advance.id
        });
        if (createdRow) created += 1;
      } else if (advance.updated_at <= warnAt) {
        const createdRow = await createNotificationIfMissing({
          recipientType: 'company',
          recipientId: advance.company_id,
          category: 'sla',
          severity: 'info',
          title: '前借り振込期限が近づいています',
          message: `承認済み ${advance.id} の振込期限が近づいています。`,
          sourceType: 'advance',
          sourceId: advance.id
        });
        if (createdRow) created += 1;
      }
    }

    return { status: 200, body: { created } };
  };
};
