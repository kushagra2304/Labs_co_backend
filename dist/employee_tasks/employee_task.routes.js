"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const require_auth_middleware_1 = require("../lab_auth/middleware/require-auth.middleware");
const employee_task_controller_1 = require("./employee_task.controller");
const task_completion_upload_middleware_1 = require("./task-completion-upload.middleware");
const router = (0, express_1.Router)();
const controller = new employee_task_controller_1.EmployeeTaskController();
// All routes require authentication
router.use(require_auth_middleware_1.requireAuth);
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
router.post('/:id/submit-completion', task_completion_upload_middleware_1.uploadTaskCompletionFile, controller.submitCompletion);
exports.default = router;
