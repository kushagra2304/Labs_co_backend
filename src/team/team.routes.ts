import { Router } from 'express';
import { requireAuth, requireRole } from '../lab_auth/middleware/require-auth.middleware';
import { TeamController } from './team.controller';

const router = Router();
const teamController = new TeamController();

// Require authenticated user AND role = admin for all team management endpoints
router.use(requireAuth);
router.use(requireRole(['admin']));

router.get('/', teamController.listEmployees);
router.get('/:id', teamController.getEmployee);
router.post('/', teamController.createEmployee);
router.put('/:id', teamController.updateEmployee);
router.delete('/:id', teamController.deleteEmployee);

export default router;
