"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTaskDeadlineCheck = runTaskDeadlineCheck;
const client_1 = __importDefault(require("../prisma/client"));
const client_2 = require("@prisma/client");
const notification_helper_1 = require("../helpers/notification.helper");
// How many days out from the due date counts as "coming up soon".
const DUE_SOON_DAYS = 3;
/**
 * Scans admin-assigned tasks for deadline reminders:
 *  - Notifies the assignee + assigner once *per day* while a task is within
 *    DUE_SOON_DAYS of its due date (so it keeps nagging daily until the due
 *    date, instead of a single one-off heads-up).
 *  - Auto-flips a task to "overdue" and notifies both once its due date
 *    has passed.
 *
 * Safe to call repeatedly (see server.ts) — dueSoonNotifiedAt/
 * overdueNotifiedAt bookkeeping prevents re-notifying more than once within
 * the same calendar day / more than once for the overdue flip.
 */
async function runTaskDeadlineCheck(io) {
    try {
        const now = new Date();
        await notifyDueSoonTasks(now, io);
        await notifyAndMarkOverdueTasks(now, io);
    }
    catch (error) {
        console.error('Task deadline reminder job failed:', error);
    }
}
async function notifyDueSoonTasks(now, io) {
    const threshold = new Date(now.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tasks = await client_1.default.task.findMany({
        where: {
            taskType: client_2.TaskType.ADMIN_ASSIGNED,
            isDeleted: false,
            deletedAt: null,
            status: { notIn: [client_2.TaskStatus.completed, client_2.TaskStatus.overdue] },
            dueDate: { gte: now, lte: threshold },
            // Not yet notified today — this is what makes the reminder repeat once
            // per day instead of firing only the first time the task enters the
            // window.
            OR: [{ dueSoonNotifiedAt: null }, { dueSoonNotifiedAt: { lt: startOfToday } }],
        },
        select: { id: true, title: true, dueDate: true, assignedTo: true, assignedBy: true },
    });
    for (const task of tasks) {
        const dueDateLabel = task.dueDate
            ? task.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'soon';
        const recipients = new Set([task.assignedTo, task.assignedBy].filter((id) => !!id));
        for (const userId of recipients) {
            await (0, notification_helper_1.publishActivity)({
                userId,
                type: 'task_due_soon',
                title: 'Task due soon',
                body: `"${task.title}" is due on ${dueDateLabel}.`,
                relatedId: task.id,
                relatedType: 'Task',
                io,
            });
        }
        await client_1.default.task.update({
            where: { id: task.id },
            data: { dueSoonNotifiedAt: new Date() },
        });
    }
}
async function notifyAndMarkOverdueTasks(now, io) {
    const tasks = await client_1.default.task.findMany({
        where: {
            taskType: client_2.TaskType.ADMIN_ASSIGNED,
            isDeleted: false,
            deletedAt: null,
            status: { notIn: [client_2.TaskStatus.completed, client_2.TaskStatus.overdue] },
            dueDate: { lt: now },
        },
        select: { id: true, title: true, assignedTo: true, assignedBy: true },
    });
    for (const task of tasks) {
        const recipients = new Set([task.assignedTo, task.assignedBy].filter((id) => !!id));
        for (const userId of recipients) {
            await (0, notification_helper_1.publishActivity)({
                userId,
                type: 'task_overdue',
                title: 'Task overdue',
                body: `"${task.title}" has passed its due date and is now marked overdue.`,
                relatedId: task.id,
                relatedType: 'Task',
                io,
            });
        }
        await client_1.default.task.update({
            where: { id: task.id },
            data: { status: client_2.TaskStatus.overdue, overdueNotifiedAt: new Date() },
        });
    }
}
