import { Router } from 'express';
import dashboardRoutes from './routes/dashboard.routes'; 
import projectRoutes from './routes/projects.routes';
import calendarRoutes from './routes/calender.routes';
import notificationRoutes from './routes/notification.routes';
import taskRoutes from '../tasks/task.routes';
import employeeTaskRoutes from '../employee_tasks/employee_task.routes';
import teamRoutes from '../team/team.routes';
import teamSettingsRoutes from '../team_settings/team_settings.routes';
import { UserController } from './controllers/user.controller';
import { requireAuth } from '../lab_auth/middleware/require-auth.middleware';

const router = Router();
const userController = new UserController();

router.use('/dashboard', dashboardRoutes);
router.use('/projects', projectRoutes);
router.use('/calendar', calendarRoutes);
router.use('/notifications', notificationRoutes);
router.use('/tasks', taskRoutes);
router.use('/employee/tasks', employeeTaskRoutes);
router.use('/admin/employees', teamRoutes);
router.use('/settings/team', teamSettingsRoutes);

// Only active employees endpoint
router.get('/employees', requireAuth, userController.getActiveEmployees);

export default router;