import prisma from '../prisma/client';
import { NotificationType } from '@prisma/client';
import { Server } from 'socket.io';

interface ActivityParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedId?: string;
  relatedType?: string;
  io?: Server;
}

export async function publishActivity({
  userId,
  type,
  title,
  body,
  relatedId,
  relatedType,
  io
}: ActivityParams) {
  try {
    // 1. Persist the activity/notification in the database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        isRead: false,
        relatedId,
        relatedType,
      },
    });

    // 2. Emit it through Socket.IO if available
    if (io) {
      io.to(userId).emit('new_notification', {
        id: notification.id,
        title: notification.title ?? "",
        body: notification.body ?? "",
        timestamp: notification.createdAt.toISOString(),
        read: notification.isRead,
        type: notification.type,
        relatedId: notification.relatedId,
        relatedType: notification.relatedType,
      });
      console.log(`⚡ Real-time activity emitted to user ${userId}:`, notification.title);
    }

    return notification;
  } catch (error) {
    console.error('Error in publishActivity helper:', error);
    return null;
  }
}
