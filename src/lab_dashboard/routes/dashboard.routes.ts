import { Router } from 'express';
import { requireAuth } from '../../lab_auth/middleware/require-auth.middleware';
import { UserController } from '../controllers/user.controller';

const router = Router();

const userController = new UserController();

// Secure all routes with auth
router.use(requireAuth);

// Employee list (previously at /api/v1/chat/employees — preserved via chat routes alias in app.ts)
router.get('/employees', userController.getEmployees);

export default router;
