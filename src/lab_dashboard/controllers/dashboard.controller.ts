import { Request, Response } from 'express';
import  prisma  from '../../prisma/client';

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const ACTION_TO_ACTIVITY_TYPE: Record<string, "upload" | "submitted" | "updated" | "overdue"> = {
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

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export class DashboardController {
  getStats = async (_req: Request, res: Response) => {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const where = { deletedAt: null as null };

    const [total, completed, thisMonthTotal, lastMonthTotal, thisMonthCompleted, lastMonthCompleted] =
      await Promise.all([
        prisma.project.count({ where }),
        prisma.project.count({ where: { ...where, status: "completed" } }),
        prisma.project.count({ where: { ...where, createdAt: { gte: startOfThisMonth } } }),
        prisma.project.count({ where: { ...where, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } } }),
        prisma.project.count({ where: { ...where, status: "completed", updatedAt: { gte: startOfThisMonth } } }),
        prisma.project.count({ where: { ...where, status: "completed", updatedAt: { gte: startOfLastMonth, lt: startOfThisMonth } } }),
      ]);

    const pending = total - completed;
    const pctChange = (curr: number, prev: number) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

    res.json({
      totalProjects: total,
      totalProjectsChangePct: pctChange(thisMonthTotal, lastMonthTotal),
      completed,
      completedChangePct: pctChange(thisMonthCompleted, lastMonthCompleted),
      pending,
      pendingChangePct: pctChange(pending, total - completed),
    });
  };

  getPerformanceChart = async (req: Request, res: Response) => {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const tasks = await prisma.task.findMany({
      where: { deletedAt: null, createdAt: { gte: yearStart, lt: yearEnd } },
      select: { createdAt: true, status: true, completedAt: true },
    });

    const points = MONTH_LABELS.map((label, i) => {
      const assigned = tasks.filter((t) => t.createdAt.getMonth() === i).length;
      const completedCount = tasks.filter(
        (t) => t.status === "completed" && t.completedAt && t.completedAt.getMonth() === i
      ).length;
      const efficiencyPct = assigned === 0 ? 0 : Math.round((completedCount / assigned) * 100);
      return { label, assigned, completed: completedCount, efficiencyPct };
    });

    res.json(points);
  };

  getActivity = async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;

    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { name: true } } },
    });

    res.json(
      logs.map((log) => ({
        id: log.id,
        type: ACTION_TO_ACTIVITY_TYPE[log.actionType] ?? "updated",
        actor: log.user?.name ?? "System",
        actorInitials: log.user ? initials(log.user.name) : "SY",
        message: log.description ?? "",
        timestamp: log.createdAt.toISOString(),
      }))
    );
  };
}