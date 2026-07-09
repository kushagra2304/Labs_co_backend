import { Server } from 'socket.io';
import prisma from '../prisma/client';
import { TaskStatus, TaskType } from '@prisma/client';
import { publishActivity } from '../helpers/notification.helper';

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
export async function runTaskDeadlineCheck(io?: Server): Promise<void> {
  try {
    const now = new Date();
    await notifyDueSoonTasks(now, io);
    await notifyAndMarkOverdueTasks(now, io);
  } catch (error) {
    console.error('Task deadline reminder job failed:', error);
  }
}

async function notifyDueSoonTasks(now: Date, io?: Server): Promise<void> {
  const threshold = new Date(now.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const tasks = await prisma.task.findMany({
    where: {
      taskType: TaskType.ADMIN_ASSIGNED,
      isDeleted: false,
      deletedAt: null,
      status: { notIn: [TaskStatus.completed, TaskStatus.overdue] },
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
    const recipients = new Set([task.assignedTo, task.assignedBy].filter((id): id is string => !!id));

    for (const userId of recipients) {
      await publishActivity({
        userId,
        type: 'task_due_soon',
        title: 'Task due soon',
        body: `"${task.title}" is due on ${dueDateLabel}.`,
        relatedId: task.id,
        relatedType: 'Task',
        io,
      });
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { dueSoonNotifiedAt: new Date() },
    });
  }
}

async function notifyAndMarkOverdueTasks(now: Date, io?: Server): Promise<void> {
  const tasks = await prisma.task.findMany({
    where: {
      taskType: TaskType.ADMIN_ASSIGNED,
      isDeleted: false,
      deletedAt: null,
      status: { notIn: [TaskStatus.completed, TaskStatus.overdue] },
      dueDate: { lt: now },
    },
    select: { id: true, title: true, assignedTo: true, assignedBy: true },
  });

  for (const task of tasks) {
    const recipients = new Set([task.assignedTo, task.assignedBy].filter((id): id is string => !!id));

    for (const userId of recipients) {
      await publishActivity({
        userId,
        type: 'task_overdue',
        title: 'Task overdue',
        body: `"${task.title}" has passed its due date and is now marked overdue.`,
        relatedId: task.id,
        relatedType: 'Task',
        io,
      });
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.overdue, overdueNotifiedAt: new Date() },
    });
  }
}
