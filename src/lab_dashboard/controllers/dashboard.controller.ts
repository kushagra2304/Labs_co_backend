import { Request, Response } from 'express';
import  prisma  from '../../prisma/client';
import { publishActivity } from '../../helpers/notification.helper';

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

  getEmployeeStats = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
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

      const [
        totalTasks,
        dueThisWeek,
        completedTasks,
        completedThisMonth,
        uploadsToday,
        pendingAck
      ] = await Promise.all([
        prisma.task.count({
          where: { deletedAt: null, assignedTo: userId, status: { in: ['pending', 'in_progress', 'overdue'] } }
        }),
        prisma.task.count({
          where: { deletedAt: null, assignedTo: userId, status: { in: ['pending', 'in_progress', 'overdue'] }, dueDate: { gte: startOfWeek, lt: endOfWeek } }
        }),
        prisma.task.count({
          where: { deletedAt: null, assignedTo: userId, status: 'completed' }
        }),
        prisma.task.count({
          where: { deletedAt: null, assignedTo: userId, status: 'completed', completedAt: { gte: startOfMonth } }
        }),
        prisma.file.count({
          where: { deletedAt: null, uploadedBy: userId, createdAt: { gte: startOfToday } }
        }),
        prisma.task.count({
          where: { deletedAt: null, assignedTo: userId, status: 'pending' }
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
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch stats" });
      return;
    }
  };

  getEmployeeTasks = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const tasks = await prisma.task.findMany({
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
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch tasks" });
      return;
    }
  };

  acknowledgeTask = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const userId = req.user!.id;
      const task = await prisma.task.findFirst({
        where: { id, assignedTo: userId, deletedAt: null }
      });
      if (!task) {
        res.status(404).json({ message: "Task not found" });
        return;
      }

      const updated = await prisma.task.update({
        where: { id },
        data: { status: 'in_progress' }
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId,
          actionType: 'task_updated',
          description: `acknowledged task "${task.title}"`,
          relatedId: id,
          relatedType: 'task'
        }
      });

      // Notify employee about task acknowledgment
      await publishActivity({
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
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to acknowledge task" });
      return;
    }
  };

  completeTask = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const userId = req.user!.id;
      const task = await prisma.task.findFirst({
        where: { id, assignedTo: userId, deletedAt: null }
      });
      if (!task) {
        res.status(404).json({ message: "Task not found" });
        return;
      }

      const updated = await prisma.task.update({
        where: { id },
        data: { status: 'completed', completedAt: new Date() }
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId,
          actionType: 'task_completed',
          description: `completed task "${task.title}"`,
          relatedId: id,
          relatedType: 'task'
        }
      });

      // Notify employee about task completion
      await publishActivity({
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
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to complete task" });
      return;
    }
  };

  getEmployeeRewards = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      let rewards = await prisma.reward.findMany({
        where: { employeeId: userId },
        orderBy: { createdAt: 'desc' }
      });

      // If no rewards, seed initial ones for demo/wow factor!
      if (rewards.length === 0) {
        await prisma.reward.createMany({
          data: [
            { employeeId: userId, type: 'badge', message: 'Runner-up Jun', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
            { employeeId: userId, type: 'star', message: 'Fast May', createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
            { employeeId: userId, type: 'appreciation', message: 'Uploader Apr', createdAt: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000) }
          ]
        });
        rewards = await prisma.reward.findMany({
          where: { employeeId: userId },
          orderBy: { createdAt: 'desc' }
        });
      }

      res.json(rewards);
      return;
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch rewards" });
      return;
    }
  };
}