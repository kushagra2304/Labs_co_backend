import { Request, Response } from 'express';
import  prisma  from '../../prisma/client';

export class NotificationController {
  listNotifications = async (req: Request, res: Response) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    res.json(
      notifications.map((n) => ({
        id: n.id,
        title: n.title ?? "",
        body: n.body ?? "",
        timestamp: n.createdAt.toISOString(),
        read: n.isRead,
        type: n.type,
        relatedId: n.relatedId,
        relatedType: n.relatedType,
      }))
    );
  };

  markRead = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    await prisma.notification.updateMany({
      where: { id, userId: req.user!.id },
      data: { isRead: true },
    });
    res.status(204).send();
  };

  markAllRead = async (req: Request, res: Response) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.status(204).send();
  };

  dismissNotification = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    await prisma.notification.deleteMany({
      where: { id, userId: req.user!.id },
    });
    res.status(204).send();
  };
}