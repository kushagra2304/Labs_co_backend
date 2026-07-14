import { Router } from 'express';
import { requireAuth, requireRole } from '../lab_auth/middleware/require-auth.middleware';
import { ProjectFilesController } from './project_files.controller';
import { uploadProjectFile } from './project-file-upload.middleware';

const router = Router();
const controller = new ProjectFilesController();

// The Files page is an admin-only surface (project storage management).
router.use(requireAuth);
router.use(requireRole(['admin']));

// NOTE: these must stay above the `/project/:projectId` and `/:id` routes
// below, otherwise Express would match "storage-summary"/"review" as params.
router.get('/storage-summary', controller.listStorageSummary);
router.get('/review', controller.listReview);

router.get('/project/:projectId', controller.listByProject);
router.post('/upload', uploadProjectFile, controller.uploadFile);

router.get('/:id/download-zip', controller.downloadZip);
router.post('/:id/keep', controller.keepFile);
router.delete('/:id', controller.deleteFile);

export default router;
