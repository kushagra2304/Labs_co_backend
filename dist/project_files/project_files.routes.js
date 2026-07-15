"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const require_auth_middleware_1 = require("../lab_auth/middleware/require-auth.middleware");
const project_files_controller_1 = require("./project_files.controller");
const project_file_upload_middleware_1 = require("./project-file-upload.middleware");
const router = (0, express_1.Router)();
const controller = new project_files_controller_1.ProjectFilesController();
// The Files page is an admin-only surface (project storage management).
router.use(require_auth_middleware_1.requireAuth);
router.use((0, require_auth_middleware_1.requireRole)(['admin']));
// NOTE: these must stay above the `/project/:projectId` and `/:id` routes
// below, otherwise Express would match "storage-summary"/"review" as params.
router.get('/storage-summary', controller.listStorageSummary);
router.get('/review', controller.listReview);
router.get('/project/:projectId', controller.listByProject);
router.post('/upload', project_file_upload_middleware_1.uploadProjectFile, controller.uploadFile);
router.get('/:id/download-zip', controller.downloadZip);
router.post('/:id/keep', controller.keepFile);
router.delete('/:id', controller.deleteFile);
exports.default = router;
