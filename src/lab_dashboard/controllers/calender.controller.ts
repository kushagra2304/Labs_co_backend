import { Request, Response } from 'express';
import  prisma  from '../../prisma/client';

export class CalendarController {
  getEvents = async (req: Request, res: Response) => {
    const year = parseInt(req.query.year as string);
    const month = parseInt(req.query.month as string);
    if (!year || !month) return res.status(400).json({ message: "year and month are required" });

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const [tasks, projects] = await Promise.all([
      prisma.task.findMany({
        where: { deletedAt: null, dueDate: { gte: start, lt: end } },
        select: { id: true, title: true, dueDate: true },
      }),
      prisma.project.findMany({
        where: { deletedAt: null, deadline: { gte: start, lt: end } },
        select: { id: true, name: true, deadline: true },
      }),
    ]);

    const events = [
      ...tasks.map((t) => ({ id: `task-${t.id}`, date: t.dueDate!.toISOString().slice(0, 10), title: t.title })),
      ...projects.map((p) => ({ id: `proj-${p.id}`, date: p.deadline!.toISOString().slice(0, 10), title: `${p.name} due` })),
    ];

    return res.json(events);
  };

  getTasksForDate = async (req: Request, res: Response) => {
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ message: "date is required" });

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const tasks = await prisma.task.findMany({
      where: { deletedAt: null, dueDate: { gte: dayStart, lte: dayEnd } },
      include: { assignee: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return res.json(
      tasks.map((t) => ({
        id: t.id,
        date,
        name: t.title,
        assignee: t.assignee?.name ?? "Unassigned",
        project: t.description?.startsWith("Category: ") ? t.description.replace("Category: ", "") : "",
        completed: t.status === "completed",
      }))
    );
  };

  createTask = async (req: Request, res: Response) => {
    const { date, name, assignee, project } = req.body;
    if (!date || !name?.trim() || !assignee) {
      return res.status(400).json({ message: "date, name and assignee are required" });
    }

    const assigneeUser = await prisma.user.findFirst({ where: { name: assignee, deletedAt: null } });
    if (!assigneeUser) return res.status(400).json({ message: `No user named "${assignee}"` });

    const task = await prisma.task.create({
      data: {
        title: name,
        description: project ? `Category: ${project}` : null,
        dueDate: new Date(`${date}T09:00:00.000Z`),
        assignedTo: assigneeUser.id,
        assignedBy: req.user!.id,
        createdBy: req.user!.id,
      },
      include: { assignee: { select: { name: true } } },
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

  deleteTask = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const existing = await prisma.task.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return res.status(404).json({ message: "Task not found" });

    await prisma.task.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: req.user!.id },
    });
    return res.status(204).send();
  };
}