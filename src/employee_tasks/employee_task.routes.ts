import { Router } from 'express';
import { requireAuth } from '../lab_auth/middleware/require-auth.middleware';
import { EmployeeTaskController } from './employee_task.controller';
import { uploadTaskCompletionFile } from './task-completion-upload.middleware';

const router = Router();
const controller = new EmployeeTaskController();

// All routes require authentication
router.use(requireAuth);

// NOTE: this must stay above the `/:id` route below, otherwise Express would
// match "pending-acknowledgment" as an `:id` param instead.
router.get('/pending-acknowledgment', controller.listPendingAcknowledgment);
router.get('/due-soon', controller.listDueSoon);

router.get('/', controller.listTasks);
router.get('/:id', controller.getTask);

router.post('/personal', controller.createPersonalTask);
router.put('/personal/:id', controller.updatePersonalTask);
router.delete('/personal/:id', controller.deletePersonalTask);

router.patch('/:id/status', controller.updateTaskStatus);
router.post('/:id/progress', controller.addTaskProgress);

router.post('/:id/acknowledge', controller.acknowledgeTask);
router.post('/:id/submit-completion', uploadTaskCompletionFile, controller.submitCompletion);

export default router;
