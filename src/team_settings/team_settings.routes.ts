import { Router } from 'express';
import { requireAuth, requireRole } from '../lab_auth/middleware/require-auth.middleware';
import { TeamSettingsController } from './team_settings.controller';
import { FeatureSettingsController } from './feature_settings.controller';

const router = Router();
const deptController = new TeamSettingsController('department');
const desigController = new TeamSettingsController('designation');
const featureController = new FeatureSettingsController();

router.use(requireAuth);

// GET routes readable by authenticated users (admin/employee) for dropdowns and filters
router.get('/departments', deptController.list);
router.get('/departments/:id', deptController.get);

router.get('/designations', desigController.list);
router.get('/designations/:id', desigController.get);

router.get('/features', featureController.get);

// Write routes restricted to admins only
router.post('/departments', requireRole(['admin']), deptController.create);
router.put('/departments/:id', requireRole(['admin']), deptController.update);
router.patch('/departments/:id/status', requireRole(['admin']), deptController.toggleStatus);
router.delete('/departments/:id', requireRole(['admin']), deptController.delete);

router.post('/designations', requireRole(['admin']), desigController.create);
router.put('/designations/:id', requireRole(['admin']), desigController.update);
router.patch('/designations/:id/status', requireRole(['admin']), desigController.toggleStatus);
router.delete('/designations/:id', requireRole(['admin']), desigController.delete);

router.patch('/features', requireRole(['admin']), featureController.update);

export default router;
