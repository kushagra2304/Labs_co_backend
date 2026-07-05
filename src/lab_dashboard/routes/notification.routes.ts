import { Router } from 'express';
import { requireAuth } from '../../lab_auth/middleware/require-auth.middleware';
import { NotificationController } from '../controllers/notification.controller';

const router = Router();

const notificationController = new NotificationController();

// Secure all routes with auth
router.use(requireAuth);

router.get('/', notificationController.listNotifications);
router.post('/:id/read', notificationController.markRead);
router.post('/read-all', notificationController.markAllRead);
router.delete('/:id', notificationController.dismissNotification);

export default router;