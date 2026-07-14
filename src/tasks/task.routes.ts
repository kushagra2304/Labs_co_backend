import { Router } from 'express';
import { requireAuth, requireRole } from '../lab_auth/middleware/require-auth.middleware';
import { TaskController } from './task.controller';

const router = Router();
const taskController = new TaskController();

// Require authenticated user AND role = admin for all admin task endpoints
router.use(requireAuth);
router.use(requireRole(['admin']));

router.get('/', taskController.listTasks);
// NOTE: this must stay above the `/:id` route below, otherwise Express would
// match "due-soon" as an `:id` param instead.
router.get('/due-soon', taskController.listDueSoon);
router.get('/:id', taskController.getTask);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.post('/:id/finalize', taskController.finalizeTask);

export default router;
