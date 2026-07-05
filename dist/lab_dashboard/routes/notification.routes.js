"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const require_auth_middleware_1 = require("../../lab_auth/middleware/require-auth.middleware");
const notification_controller_1 = require("../controllers/notification.controller");
const router = (0, express_1.Router)();
const notificationController = new notification_controller_1.NotificationController();
// Secure all routes with auth
router.use(require_auth_middleware_1.requireAuth);
router.get('/', notificationController.listNotifications);
router.post('/:id/read', notificationController.markRead);
router.post('/read-all', notificationController.markAllRead);
router.delete('/:id', notificationController.dismissNotification);
exports.default = router;
