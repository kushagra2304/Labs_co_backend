"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarController = void 0;
const client_1 = __importDefault(require("../../prisma/client"));
const notification_helper_1 = require("../../helpers/notification.helper");
class CalendarController {
    getEvents = async (req, res) => {
        const year = parseInt(req.query.year);
        const month = parseInt(req.query.month);
        if (!year || !month)
            return res.status(400).json({ message: "year and month are required" });
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);
        const [tasks, projects] = await Promise.all([
            client_1.default.task.findMany({
                where: { deletedAt: null, dueDate: { gte: start, lt: end } },
                select: { id: true, title: true, dueDate: true },
            }),
            client_1.default.project.findMany({
                where: { deletedAt: null, deadline: { gte: start, lt: end } },
                select: { id: true, name: true, deadline: true },
            }),
        ]);
        const events = [
            ...tasks.map((t) => ({ id: `task-${t.id}`, date: t.dueDate.toISOString().slice(0, 10), title: t.title })),
            ...projects.map((p) => ({ id: `proj-${p.id}`, date: p.deadline.toISOString().slice(0, 10), title: `${p.name} due` })),
        ];
        return res.json(events);
    };
    getTasksForDate = async (req, res) => {
        const date = req.query.date;
        if (!date)
            return res.status(400).json({ message: "date is required" });
        const dayStart = new Date(`${date}T00:00:00.000Z`);
        const dayEnd = new Date(`${date}T23:59:59.999Z`);
        const tasks = await client_1.default.task.findMany({
            where: { deletedAt: null, dueDate: { gte: dayStart, lte: dayEnd } },
            include: { assignee: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
        });
        return res.json(tasks.map((t) => ({
            id: t.id,
            date,
            name: t.title,
            assignee: t.assignee?.name ?? "Unassigned",
            project: t.description?.startsWith("Category: ") ? t.description.replace("Category: ", "") : "",
            completed: t.status === "completed",
        })));
    };
    createTask = async (req, res) => {
        const { date, name, assignee, project } = req.body;
        if (!date || !name?.trim() || !assignee) {
            return res.status(400).json({ message: "date, name and assignee are required" });
        }
        const assigneeUser = await client_1.default.user.findFirst({ where: { name: assignee, deletedAt: null } });
        if (!assigneeUser)
            return res.status(400).json({ message: `No user named "${assignee}"` });
        const task = await client_1.default.task.create({
            data: {
                title: name,
                description: project ? `Category: ${project}` : null,
                dueDate: new Date(`${date}T09:00:00.000Z`),
                assignedTo: assigneeUser.id,
                assignedBy: req.user.id,
                createdBy: req.user.id,
            },
            include: { assignee: { select: { name: true } } },
        });
        // Notify employee about task assignment
        await (0, notification_helper_1.publishActivity)({
            userId: assigneeUser.id,
            type: 'task_assigned',
            title: 'New task assigned',
            body: `Admin assigned you task: "${task.title}"`,
            relatedId: task.id,
            relatedType: 'Task',
            io: req.app.get('io')
        });
        return res.status(201).json({
            id: task.id,
            date,
            name: task.title,
            assignee: task.assignee?.name ?? assignee,
            project: project ?? "",
            completed: false,
        });
    };
    deleteTask = async (req, res) => {
        const id = String(req.params.id);
        const existing = await client_1.default.task.findFirst({ where: { id, deletedAt: null } });
        if (!existing)
            return res.status(404).json({ message: "Task not found" });
        await client_1.default.task.update({
            where: { id },
            data: { deletedAt: new Date(), deletedBy: req.user.id },
        });
        // Notify employee if the task was assigned to someone
        if (existing.assignedTo) {
            await (0, notification_helper_1.publishActivity)({
                userId: existing.assignedTo,
                type: 'reminder',
                title: 'Task deleted by admin',
                body: `Task "${existing.title}" has been deleted.`,
                relatedId: existing.id,
                relatedType: 'Task',
                io: req.app.get('io')
            });
        }
        return res.status(204).send();
    };
}
exports.CalendarController = CalendarController;
