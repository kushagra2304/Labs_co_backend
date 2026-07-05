"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const require_auth_middleware_1 = require("../../lab_auth/middleware/require-auth.middleware");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
// import { UserController } from '../controllers/user.controller';
const router = (0, express_1.Router)();
const dashboardController = new dashboard_controller_1.DashboardController();
// Secure all routes with auth
router.use(require_auth_middleware_1.requireAuth);
router.get('/stats', dashboardController.getStats);
router.get('/performance-chart', dashboardController.getPerformanceChart);
router.get('/activity', dashboardController.getActivity);
// router.get('/employees', UserController.getEmployees);
exports.default = router;
