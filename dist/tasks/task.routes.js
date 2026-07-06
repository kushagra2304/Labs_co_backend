"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const require_auth_middleware_1 = require("../lab_auth/middleware/require-auth.middleware");
const task_controller_1 = require("./task.controller");
const router = (0, express_1.Router)();
const taskController = new task_controller_1.TaskController();
// Require authenticated user AND role = admin for all admin task endpoints
router.use(require_auth_middleware_1.requireAuth);
router.use((0, require_auth_middleware_1.requireRole)(['admin']));
router.get('/', taskController.listTasks);
router.get('/:id', taskController.getTask);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
exports.default = router;
