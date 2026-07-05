"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const require_auth_middleware_1 = require("../../lab_auth/middleware/require-auth.middleware");
const calender_controller_1 = require("../controllers/calender.controller");
const router = (0, express_1.Router)();
const calendarController = new calender_controller_1.CalendarController();
// Secure all routes with auth
router.use(require_auth_middleware_1.requireAuth);
router.get('/events', calendarController.getEvents);
router.get('/tasks', calendarController.getTasksForDate);
router.post('/tasks', calendarController.createTask);
router.delete('/tasks/:id', calendarController.deleteTask);
exports.default = router;
