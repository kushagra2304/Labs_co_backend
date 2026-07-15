"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const require_auth_middleware_1 = require("../lab_auth/middleware/require-auth.middleware");
const task_submission_controller_1 = require("./task_submission.controller");
const router = (0, express_1.Router)();
const controller = new task_submission_controller_1.TaskSubmissionController();
// Reviewing completion submissions is an admin-only action — this powers the
// "Requests" tab on the Tasks page.
router.use(require_auth_middleware_1.requireAuth);
router.use((0, require_auth_middleware_1.requireRole)(['admin']));
router.get('/', controller.list);
router.get('/:id', controller.get);
router.patch('/:id/review', controller.review);
exports.default = router;
