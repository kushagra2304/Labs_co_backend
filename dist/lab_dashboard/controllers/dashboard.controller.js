"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const client_1 = __importDefault(require("../../prisma/client"));
const client_2 = require("@prisma/client");
const notification_helper_1 = require("../../helpers/notification.helper");
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ACTION_TO_ACTIVITY_TYPE = {
    file_uploaded: "upload",
    task_completed: "submitted",
    project_completed: "submitted",
    task_created: "updated",
    task_updated: "updated",
    project_created: "updated",
    project_updated: "updated",
    employee_added: "updated",
    employee_removed: "updated",
    reward_given: "updated",
    message_sent: "updated",
};
function initials(name) {
    return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
class DashboardController {
    getStats = async (_req, res) => {
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const where = { deletedAt: null };
        const [total, completed, thisMonthTotal, lastMonthTotal, thisMonthCompleted, lastMonthCompleted, thisMonthPending, lastMonthPending,] = await Promise.all([
            client_1.default.project.count({ where }),
            client_1.default.project.count({ where: { ...where, status: "completed" } }),
            client_1.default.project.count({ where: { ...where, createdAt: { gte: startOfThisMonth } } }),
            client_1.default.project.count({ where: { ...where, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } } }),
            client_1.default.project.count({ where: { ...where, status: "completed", updatedAt: { gte: startOfThisMonth } } }),
            client_1.default.project.count({ where: { ...where, status: "completed", updatedAt: { gte: startOfLastMonth, lt: startOfThisMonth } } }),
            // Pending = created this/last month and still not completed — mirrors
            // the totalProjects comparison above (new-per-month), just scoped to
            // the not-yet-completed subset so the trend is meaningful instead of
            // comparing `pending` against itself (which always produced 0%).
            client_1.default.project.count({ where: { ...where, status: { not: "completed" }, createdAt: { gte: startOfThisMonth } } }),
            client_1.default.project.count({ where: { ...where, status: { not: "completed" }, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } } }),
        ]);
        const pending = total - completed;
        const pctChange = (curr, prev) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);
        res.json({
            totalProjects: total,
            totalProjectsChangePct: pctChange(thisMonthTotal, lastMonthTotal),
            completed,
            completedChangePct: pctChange(thisMonthCompleted, lastMonthCompleted),
            pending,
            pendingChangePct: pctChange(thisMonthPending, lastMonthPending),
        });
    };
    getPerformanceChart = async (req, res) => {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year + 1, 0, 1);
        const tasks = await client_1.default.task.findMany({
            where: { deletedAt: null, createdAt: { gte: yearStart, lt: yearEnd } },
            select: { createdAt: true, status: true, completedAt: true },
        });
        const points = MONTH_LABELS.map((label, i) => {
            const assigned = tasks.filter((t) => t.createdAt.getMonth() === i).length;
            const completedCount = tasks.filter((t) => t.status === "completed" && t.completedAt && t.completedAt.getMonth() === i).length;
            const efficiencyPct = assigned === 0 ? 0 : Math.round((completedCount / assigned) * 100);
            return { label, assigned, completed: completedCount, efficiencyPct };
        });
        res.json(points);
    };
    getActivity = async (req, res) => {
        const limit = parseInt(req.query.limit) || 10;
        const logs = await client_1.default.activityLog.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
            include: { user: { select: { name: true } } },
        });
        res.json(logs.map((log) => ({
            id: log.id,
            type: ACTION_TO_ACTIVITY_TYPE[log.actionType] ?? "updated",
            actor: log.user?.name ?? "System",
            actorInitials: log.user ? initials(log.user.name) : "SY",
            message: log.description ?? "",
            timestamp: log.createdAt.toISOString(),
        })));
    };
    getEmployeeStats = async (req, res) => {
        try {
            const userId = req.user.id;
            const startOfWeek = new Date();
            startOfWeek.setHours(0, 0, 0, 0);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 7);
            const startOfMonth = new Date();
            startOfMonth.setHours(0, 0, 0, 0);
            startOfMonth.setDate(1);
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const [totalTasks, dueThisWeek, completedTasks, completedThisMonth, uploadsToday, pendingAck] = await Promise.all([
                client_1.default.task.count({
                    where: { deletedAt: null, assignedTo: userId, status: { in: ['pending', 'in_progress', 'overdue'] } }
                }),
                client_1.default.task.count({
                    where: { deletedAt: null, assignedTo: userId, status: { in: ['pending', 'in_progress', 'overdue'] }, dueDate: { gte: startOfWeek, lt: endOfWeek } }
                }),
                client_1.default.task.count({
                    where: { deletedAt: null, assignedTo: userId, status: 'completed' }
                }),
                client_1.default.task.count({
                    where: { deletedAt: null, assignedTo: userId, status: 'completed', completedAt: { gte: startOfMonth } }
                }),
                client_1.default.file.count({
                    where: { deletedAt: null, uploadedBy: userId, createdAt: { gte: startOfToday } }
                }),
                // "Pending acknowledgment" now tracks the real acknowledgedAt gate
                // (admin-assigned tasks only) rather than the legacy "pending" status,
                // since a task can sit in status "pending" after being acknowledged too.
                client_1.default.task.count({
                    where: { deletedAt: null, assignedTo: userId, taskType: client_2.TaskType.ADMIN_ASSIGNED, acknowledgedAt: null }
                })
            ]);
            res.json({
                totalTasks,
                dueThisWeek,
                completedTasks,
                completedThisMonth,
                uploadsToday,
                pendingAck
            });
            return;
        }
        catch (error) {
            res.status(500).json({ message: error.message || "Failed to fetch stats" });
            return;
        }
    };
    getEmployeeTasks = async (req, res) => {
        try {
            const userId = req.user.id;
            const tasks = await client_1.default.task.findMany({
                where: { deletedAt: null, assignedTo: userId },
                include: {
                    project: { select: { id: true, name: true } },
                    files: true
                },
                orderBy: [
                    { status: 'asc' },
                    { dueDate: 'asc' }
                ]
            });
            res.json(tasks);
            return;
        }
        catch (error) {
            res.status(500).json({ message: error.message || "Failed to fetch tasks" });
            return;
        }
    };
    acknowledgeTask = async (req, res) => {
        try {
            const id = String(req.params.id);
            const userId = req.user.id;
            const task = await client_1.default.task.findFirst({
                where: { id, assignedTo: userId, deletedAt: null }
            });
            if (!task) {
                res.status(404).json({ message: "Task not found" });
                return;
            }
            const updated = await client_1.default.task.update({
                where: { id },
                data: { status: 'in_progress' }
            });
            // Log activity
            await client_1.default.activityLog.create({
                data: {
                    userId,
                    actionType: 'task_updated',
                    description: `acknowledged task "${task.title}"`,
                    relatedId: id,
                    relatedType: 'task'
                }
            });
            // Notify employee about task acknowledgment
            await (0, notification_helper_1.publishActivity)({
                userId,
                type: 'task_assigned',
                title: 'Task acknowledged',
                body: `You acknowledged the task: "${task.title}"`,
                relatedId: id,
                relatedType: 'Task',
                io: req.app.get('io')
            });
            res.json(updated);
            return;
        }
        catch (error) {
            res.status(500).json({ message: error.message || "Failed to acknowledge task" });
            return;
        }
    };
    completeTask = async (req, res) => {
        try {
            const id = String(req.params.id);
            const userId = req.user.id;
            const task = await client_1.default.task.findFirst({
                where: { id, assignedTo: userId, deletedAt: null }
            });
            if (!task) {
                res.status(404).json({ message: "Task not found" });
                return;
            }
            const updated = await client_1.default.task.update({
                where: { id },
                data: { status: 'completed', completedAt: new Date() }
            });
            // Log activity
            await client_1.default.activityLog.create({
                data: {
                    userId,
                    actionType: 'task_completed',
                    description: `completed task "${task.title}"`,
                    relatedId: id,
                    relatedType: 'task'
                }
            });
            // Notify employee about task completion
            await (0, notification_helper_1.publishActivity)({
                userId,
                type: 'task_completed',
                title: 'Task marked completed',
                body: `You completed the task: "${task.title}"`,
                relatedId: id,
                relatedType: 'Task',
                io: req.app.get('io')
            });
            res.json(updated);
            return;
        }
        catch (error) {
            res.status(500).json({ message: error.message || "Failed to complete task" });
            return;
        }
    };
    // Real points/rank/badges — replaces the old version of this endpoint which
    // just auto-seeded 3 fake demo rows on first call ("Runner-up Jun" etc. were
    // literal hardcoded strings, not earned). Everything below is derived from
    // actual task/file activity; nothing is fabricated. The `Reward` table
    // itself is left in place as a hook for a future admin "give a reward"
    // feature — it's just no longer auto-populated with fake rows.
    getEmployeeRewards = async (req, res) => {
        try {
            const userId = req.user.id;
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthLabel = now.toLocaleDateString("en-US", { month: "short" });
            const POINTS_PER_TASK = 100;
            const [completedTasks, completedThisMonth, uploadsThisMonth] = await Promise.all([
                client_1.default.task.count({ where: { deletedAt: null, assignedTo: userId, status: 'completed' } }),
                client_1.default.task.count({ where: { deletedAt: null, assignedTo: userId, status: 'completed', completedAt: { gte: startOfMonth } } }),
                client_1.default.file.count({ where: { deletedAt: null, uploadedBy: userId, createdAt: { gte: startOfMonth } } }),
            ]);
            // Rank this month among real employees, ranked by tasks completed this
            // month (a fair, comparable metric — raw points is just this * 100).
            const employees = await client_1.default.user.findMany({
                where: { role: 'employee', deletedAt: null, isActive: true },
                select: { id: true },
            });
            const monthlyCompletions = await Promise.all(employees.map((e) => client_1.default.task.count({
                where: { deletedAt: null, assignedTo: e.id, status: 'completed', completedAt: { gte: startOfMonth } },
            }).then((count) => ({ id: e.id, count }))));
            monthlyCompletions.sort((a, b) => b.count - a.count);
            const rank = monthlyCompletions.findIndex((e) => e.id === userId) + 1 || monthlyCompletions.length + 1;
            const totalEmployees = employees.length;
            // "Fast Finisher" = completed a task at least a day ahead of its due
            // date, this month — a real per-task check (completedAt vs dueDate).
            const fastFinishTasks = await client_1.default.task.findMany({
                where: {
                    deletedAt: null,
                    assignedTo: userId,
                    status: 'completed',
                    completedAt: { gte: startOfMonth },
                    dueDate: { not: null },
                },
                select: { completedAt: true, dueDate: true },
            });
            const fastFinishCount = fastFinishTasks.filter((t) => t.completedAt && t.dueDate && t.completedAt.getTime() <= t.dueDate.getTime() - 24 * 60 * 60 * 1000).length;
            const points = completedTasks * POINTS_PER_TASK;
            const monthlyPoints = completedThisMonth * POINTS_PER_TASK;
            const targetPoints = 1500;
            const badges = [
                {
                    id: 'rank',
                    label: rank === 1 ? `Top Performer ${monthLabel}` : rank === 2 ? `Runner-up ${monthLabel}` : `Rank #${rank} ${monthLabel}`,
                    achieved: rank <= 2 && totalEmployees > 1,
                },
                {
                    id: 'speed',
                    label: `Fast Finisher ${monthLabel}`,
                    achieved: fastFinishCount > 0,
                },
                {
                    id: 'uploader',
                    label: `Uploader ${monthLabel}`,
                    achieved: uploadsThisMonth >= 5,
                },
                {
                    id: 'consistency',
                    label: `On a Roll ${monthLabel}`,
                    achieved: completedThisMonth >= 3,
                },
            ];
            res.json({ points, monthlyPoints, targetPoints, rank, totalEmployees, badges });
            return;
        }
        catch (error) {
            res.status(500).json({ message: error.message || "Failed to fetch rewards" });
            return;
        }
    };
}
exports.DashboardController = DashboardController;
