import { Router } from 'express';
import { requireAuth, requireRole } from '../lab_auth/middleware/require-auth.middleware';
import { TaskController } from './task.controller';

const router = Router();
const taskController = new TaskController();

// Require authenticated user AND role = admin for all admin task endpoints
router.use(requireAuth);
router.use(requireRole(['admin']));

router.get('/', taskController.listTasks);
router.get('/:id', taskController.getTask);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

export default router;
