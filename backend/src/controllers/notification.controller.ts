import { Response } from 'express';
import prisma from '../config/db';
import { sendSuccess } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', unreadOnly } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where: Record<string, unknown> = { userId: req.user!.userId };
  if (unreadOnly === 'true') where.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } }),
  ]);

  sendSuccess(res, { notifications, total, unreadCount, page: parseInt(page), limit: parseInt(limit) });
};

export const markRead = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  if (id === 'all') {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId },
      data: { isRead: true },
    });
    sendSuccess(res, null, 'All notifications marked as read');
    return;
  }

  await prisma.notification.updateMany({
    where: { id, userId: req.user!.userId },
    data: { isRead: true },
  });
  sendSuccess(res, null, 'Notification marked as read');
};
