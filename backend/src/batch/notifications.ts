import { prisma } from '../repositories/prisma/client';

type NotificationParams = {
  recipientType: string;
  recipientId: string | null;
  category: string;
  severity: string;
  title: string;
  message: string;
  sourceType: string;
  sourceId: string;
};

export const createNotificationIfMissing = async (params: NotificationParams) => {
  const exists = await prisma.notifications.findFirst({
    where: {
      recipient_type: params.recipientType,
      recipient_id: params.recipientId,
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
