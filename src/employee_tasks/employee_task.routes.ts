import { Router } from 'express';
import { requireAuth } from '../lab_auth/middleware/require-auth.middleware';
import { EmployeeTaskController } from './employee_task.controller';

const router = Router();
const controller = new EmployeeTaskController();

// All routes require authentication
router.use(requireAuth);

router.get('/', controller.listTasks);
router.get('/:id', controller.getTask);

router.post('/personal', controller.createPersonalTask);
router.put('/personal/:id', controller.updatePersonalTask);
router.delete('/personal/:id', controller.deletePersonalTask);

router.patch('/:id/status', controller.updateTaskStatus);
router.post('/:id/progress', controller.addTaskProgress);

export default router;
