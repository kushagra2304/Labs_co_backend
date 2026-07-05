import { Router } from 'express';
import { requireAuth } from '../../lab_auth/middleware/require-auth.middleware';
// src/lab_dashboard/routes/calendar.routes.ts
import { CalendarController } from '../controllers/calender.controller';

const router = Router();

const calendarController = new CalendarController();

// Secure all routes with auth
router.use(requireAuth);

router.get('/events', calendarController.getEvents);
router.get('/tasks', calendarController.getTasksForDate);
router.post('/tasks', calendarController.createTask);
router.delete('/tasks/:id', calendarController.deleteTask);

export default router;