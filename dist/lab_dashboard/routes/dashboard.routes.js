"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const require_auth_middleware_1 = require("../../lab_auth/middleware/require-auth.middleware");
const user_controller_1 = require("../controllers/user.controller");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const router = (0, express_1.Router)();
const userController = new user_controller_1.UserController();
const dashboardController = new dashboard_controller_1.DashboardController();
// Secure all routes with auth
router.use(require_auth_middleware_1.requireAuth);
// Employee list (previously at /api/v1/chat/employees — preserved via chat routes alias in app.ts)
router.get('/employees', userController.getEmployees);
// Dashboard widgets
router.get('/stats', dashboardController.getStats);
router.get('/performance-chart', dashboardController.getPerformanceChart);
router.get('/activity', dashboardController.getActivity);
// Employee Dashboard routes
router.get('/employee/stats', dashboardController.getEmployeeStats);
router.get('/employee/tasks', dashboardController.getEmployeeTasks);
router.post('/employee/tasks/:id/acknowledge', dashboardController.acknowledgeTask);
router.post('/employee/tasks/:id/complete', dashboardController.completeTask);
router.get('/employee/rewards', dashboardController.getEmployeeRewards);
exports.default = router;
