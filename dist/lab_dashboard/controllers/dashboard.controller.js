"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const client_1 = __importDefault(require("../../prisma/client"));
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
    getStats = async (req, res) => {
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const where = { deletedAt: null };
        const [total, completed, thisMonthTotal, lastMonthTotal, thisMonthCompleted, lastMonthCompleted] = await Promise.all([
            client_1.default.project.count({ where }),
            client_1.default.project.count({ where: { ...where, status: "completed" } }),
            client_1.default.project.count({ where: { ...where, createdAt: { gte: startOfThisMonth } } }),
            client_1.default.project.count({ where: { ...where, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } } }),
            client_1.default.project.count({ where: { ...where, status: "completed", updatedAt: { gte: startOfThisMonth } } }),
            client_1.default.project.count({ where: { ...where, status: "completed", updatedAt: { gte: startOfLastMonth, lt: startOfThisMonth } } }),
        ]);
        const pending = total - completed;
        const pctChange = (curr, prev) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);
        res.json({
            totalProjects: total,
            totalProjectsChangePct: pctChange(thisMonthTotal, lastMonthTotal),
            completed,
            completedChangePct: pctChange(thisMonthCompleted, lastMonthCompleted),
            pending,
            pendingChangePct: pctChange(pending, total - completed),
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
}
exports.DashboardController = DashboardController;
