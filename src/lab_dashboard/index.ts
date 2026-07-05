import { Router } from 'express';
import dashboardRoutes from './routes/dashboard.routes'; 
import projectRoutes from './routes/projects.routes';
import calendarRoutes from './routes/calender.routes';
import notificationRoutes from './routes/notification.routes';

const router = Router();

router.use('/dashboard', dashboardRoutes);
router.use('/projects', projectRoutes);
router.use('/calendar', calendarRoutes);
router.use('/notifications', notificationRoutes);

export default router;