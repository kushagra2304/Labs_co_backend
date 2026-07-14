import { Router } from 'express';
import { requireAuth, requireRole } from '../../lab_auth/middleware/require-auth.middleware';
import { AttendanceController } from '../controllers/attendance.controller';

const router = Router();
const controller = new AttendanceController();

// All routes require authentication
router.use(requireAuth);

// Policy routes
router.get('/policy', controller.getPolicy);
router.put('/policy', requireRole(['admin']), controller.updatePolicy);

// WiFi Management routes
router.get('/wifi', controller.getWifiList);
router.post('/wifi', requireRole(['admin']), controller.addWifi);
router.put('/wifi/:id', requireRole(['admin']), controller.updateWifi);
router.delete('/wifi/:id', requireRole(['admin']), controller.deleteWifi);
router.post('/wifi/:id/restore', requireRole(['admin']), controller.restoreWifi);

// Holiday Management routes
router.get('/holidays', controller.getHolidays);
router.post('/holidays', requireRole(['admin']), controller.addHoliday);
router.delete('/holidays/:id', requireRole(['admin']), controller.deleteHoliday);

// Core Attendance Operations
router.post('/check-in', controller.checkIn);
router.post('/check-out', controller.checkOut);
router.get('/today', controller.getTodayStatus);

// Manual Attendance Requests
router.post('/requests', controller.submitRequest);
router.get('/requests', controller.getRequests);
router.put('/requests/:id/status', requireRole(['admin']), controller.processRequest);

// History and Statistics
router.get('/history', controller.getHistory);
router.get('/stats', controller.getStats);
router.get('/reports', controller.getReports);

// Notifications
router.get('/notifications', controller.getNotifications);
router.post('/notifications/:id/read', controller.markNotificationRead);

// Audit Logs
router.get('/audit-logs', requireRole(['admin']), controller.getAuditLogs);

export default router;
