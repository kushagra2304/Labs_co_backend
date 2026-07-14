"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const projects_routes_1 = __importDefault(require("./routes/projects.routes"));
const calender_routes_1 = __importDefault(require("./routes/calender.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const task_routes_1 = __importDefault(require("../tasks/task.routes"));
const employee_task_routes_1 = __importDefault(require("../employee_tasks/employee_task.routes"));
const team_routes_1 = __importDefault(require("../team/team.routes"));
const team_settings_routes_1 = __importDefault(require("../team_settings/team_settings.routes"));
const user_controller_1 = require("./controllers/user.controller");
const require_auth_middleware_1 = require("../lab_auth/middleware/require-auth.middleware");
const router = (0, express_1.Router)();
const userController = new user_controller_1.UserController();
router.use('/dashboard', dashboard_routes_1.default);
router.use('/projects', projects_routes_1.default);
router.use('/calendar', calender_routes_1.default);
router.use('/notifications', notification_routes_1.default);
router.use('/tasks', task_routes_1.default);
router.use('/employee/tasks', employee_task_routes_1.default);
router.use('/admin/employees', team_routes_1.default);
router.use('/settings/team', team_settings_routes_1.default);
// Only active employees endpoint
router.get('/employees', require_auth_middleware_1.requireAuth, userController.getActiveEmployees);
exports.default = router;
