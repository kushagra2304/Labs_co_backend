import { Router } from 'express';
import { requireAuth, requireRole } from '../lab_auth/middleware/require-auth.middleware';
import { TaskSubmissionController } from './task_submission.controller';

const router = Router();
const controller = new TaskSubmissionController();

// Reviewing completion submissions is an admin-only action — this powers the
// "Requests" tab on the Tasks page.
router.use(requireAuth);
router.use(requireRole(['admin']));

router.get('/', controller.list);
router.get('/:id', controller.get);
router.patch('/:id/review', controller.review);

export default router;
