import prisma from '../config/db';
import { NotificationType } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: keyof typeof NotificationType;
  link?: string;
}

export const notificationService = {
  async create(params: CreateNotificationParams) {
    return prisma.notification.create({ data: params });
  },
};
