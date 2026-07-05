import { Router } from 'express';
import { requireAuth } from '../../lab_auth/middleware/require-auth.middleware';
import { UserController } from '../controllers/user.controller';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();

const userController = new UserController();
const dashboardController = new DashboardController();

// Secure all routes with auth
router.use(requireAuth);

// Employee list (previously at /api/v1/chat/employees — preserved via chat routes alias in app.ts)
router.get('/employees', userController.getEmployees);

// Dashboard widgets
router.get('/stats', dashboardController.getStats);
router.get('/performance-chart', dashboardController.getPerformanceChart);
router.get('/activity', dashboardController.getActivity);

export default router;