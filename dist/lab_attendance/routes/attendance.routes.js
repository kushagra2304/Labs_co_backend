"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const require_auth_middleware_1 = require("../../lab_auth/middleware/require-auth.middleware");
const attendance_controller_1 = require("../controllers/attendance.controller");
const router = (0, express_1.Router)();
const controller = new attendance_controller_1.AttendanceController();
// All routes require authentication
router.use(require_auth_middleware_1.requireAuth);
// Policy routes
router.get('/policy', controller.getPolicy);
router.put('/policy', (0, require_auth_middleware_1.requireRole)(['admin']), controller.updatePolicy);
// WiFi Management routes
router.get('/wifi', controller.getWifiList);
router.post('/wifi', (0, require_auth_middleware_1.requireRole)(['admin']), controller.addWifi);
router.put('/wifi/:id', (0, require_auth_middleware_1.requireRole)(['admin']), controller.updateWifi);
router.delete('/wifi/:id', (0, require_auth_middleware_1.requireRole)(['admin']), controller.deleteWifi);
router.post('/wifi/:id/restore', (0, require_auth_middleware_1.requireRole)(['admin']), controller.restoreWifi);
// Holiday Management routes
router.get('/holidays', controller.getHolidays);
router.post('/holidays', (0, require_auth_middleware_1.requireRole)(['admin']), controller.addHoliday);
router.delete('/holidays/:id', (0, require_auth_middleware_1.requireRole)(['admin']), controller.deleteHoliday);
// Core Attendance Operations
router.post('/check-in', controller.checkIn);
router.post('/check-out', controller.checkOut);
router.get('/today', controller.getTodayStatus);
// Manual Attendance Requests
router.post('/requests', controller.submitRequest);
router.get('/requests', controller.getRequests);
router.put('/requests/:id/status', (0, require_auth_middleware_1.requireRole)(['admin']), controller.processRequest);
// History and Statistics
router.get('/history', controller.getHistory);
router.get('/stats', controller.getStats);
router.get('/reports', controller.getReports);
// Notifications
router.get('/notifications', controller.getNotifications);
router.post('/notifications/:id/read', controller.markNotificationRead);
// Audit Logs
router.get('/audit-logs', (0, require_auth_middleware_1.requireRole)(['admin']), controller.getAuditLogs);
exports.default = router;
