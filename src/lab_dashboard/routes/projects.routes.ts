import { Router } from 'express';
import { requireAuth } from '../../lab_auth/middleware/require-auth.middleware';
import { ProjectController } from '../controllers/project.controller';

const router = Router();

const projectController = new ProjectController();

// Secure all routes with auth
router.use(requireAuth);

router.get('/', projectController.listProjects);
router.get('/:id', projectController.getProject);
router.post('/', projectController.createProject);
router.patch('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

export default router;