import { TaskRepository, TaskFilters, PaginatedTasks } from './task.repository';
import { UserRepository } from '../helpers/user.repository';
import { Task, TaskStatus, Priority } from '@prisma/client';

export class TaskService {
  constructor(
    private taskRepo = new TaskRepository(),
    private userRepo = new UserRepository()
  ) {}

  async getTasks(filters: TaskFilters): Promise<PaginatedTasks> {
    return this.taskRepo.findAll(filters);
  }

  async getTaskById(id: string): Promise<Task> {
    const task = await this.taskRepo.findById(id);
    if (!task) {
      throw new Error('Task not found');
    }
    return task;
  }

  // Tasks due within the next few days (default 3), or already overdue,
  // that aren't completed yet — feeds the admin "Due / Overdue" tab.
  async getDueSoonTasks(withinDays = 3) {
    return this.taskRepo.findDueSoon(withinDays);
  }

  async createTask(
    data: {
      title: string;
      description: string;
      assignedTo: string;
      priority: string;
      status: string;
      dueDate: string | null;
      estimatedHours?: number | null;
    },
    actorId: string
  ): Promise<Task> {
    await this.validateTaskData(data);

    return this.taskRepo.create({
      title: data.title.trim(),
      description: data.description.trim(),
      assignedTo: data.assignedTo,
      priority: data.priority.toLowerCase() as Priority,
      status: data.status.toLowerCase() as TaskStatus,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      estimatedHours: data.estimatedHours !== undefined ? data.estimatedHours : null,
      actorId,
    });
  }

  async updateTask(
    id: string,
    data: {
      title?: string;
      description?: string;
      assignedTo?: string;
      priority?: string;
      status?: string;
      dueDate?: string | null;
      estimatedHours?: number | null;
    },
    actorId: string
  ): Promise<Task> {
    const existing = await this.taskRepo.findById(id);
    if (!existing) {
      throw new Error('Task not found');
    }

    await this.validateTaskData(data, true);

    // A due-date change invalidates any previous "due soon" reminder — reset
    // it so the deadline job can notify again if the new date re-enters the
    // reminder window.
    const dueDateChanged = data.dueDate !== undefined;

    return this.taskRepo.update(id, {
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.description !== undefined && { description: data.description.trim() }),
      ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
      ...(data.priority !== undefined && { priority: data.priority.toLowerCase() as Priority }),
      ...(data.status !== undefined && { status: data.status.toLowerCase() as TaskStatus }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
      ...(dueDateChanged && { dueSoonNotifiedAt: null, overdueNotifiedAt: null }),
      actorId,
    });
  }

  async softDeleteTask(id: string, actorId: string): Promise<Task> {
    const existing = await this.taskRepo.findById(id);
    if (!existing) {
      throw new Error('Task not found');
    }
    return this.taskRepo.softDelete(id, actorId);
  }

  // Final admin sign-off. Deliberately separate from the employee marking a
  // task "completed" and from a submitted file being accepted: an accepted
  // file does not by itself close out the task, the admin must finalize it.
  async finalizeTask(id: string, adminId: string): Promise<Task> {
    const task = await this.taskRepo.findById(id);
    if (!task) {
      throw new Error('Task not found');
    }
    if (task.adminVerifiedAt) {
      throw new Error('Task is already finalized');
    }
    const latestSubmission = await this.taskRepo.getLatestSubmission(id);
    if (!latestSubmission || latestSubmission.status !== 'accepted') {
      throw new Error('Task can only be finalized after its submitted file has been accepted');
    }
    return this.taskRepo.finalize(id, adminId);
  }

  private async validateTaskData(
    data: {
      title?: string;
      description?: string;
      assignedTo?: string;
      priority?: string;
      status?: string;
      dueDate?: string | null;
    },
    isUpdate = false
  ): Promise<void> {
    // Title validation
    if (!isUpdate || data.title !== undefined) {
      if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
        throw new Error('Task title is required');
      }
    }

    // Description validation
    if (!isUpdate || data.description !== undefined) {
      if (!data.description || typeof data.description !== 'string' || !data.description.trim()) {
        throw new Error('Task description is required');
      }
    }

    // Assignee validation
    if (!isUpdate || data.assignedTo !== undefined) {
      if (!data.assignedTo || typeof data.assignedTo !== 'string') {
        throw new Error('Assignee employee is required');
      }
      const employee = await this.userRepo.findById(data.assignedTo);
      if (!employee) {
        throw new Error('Assigned employee does not exist');
      }
      if (!employee.isActive || employee.deletedAt !== null) {
        throw new Error('Assigned employee must be an active, non-deleted user');
      }
    }

    // Priority validation
    if (!isUpdate || data.priority !== undefined) {
      if (!data.priority || typeof data.priority !== 'string') {
        throw new Error('Priority is required');
      }
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      if (!validPriorities.includes(data.priority.toLowerCase())) {
        throw new Error(`Priority must be one of: ${validPriorities.join(', ')}`);
      }
    }

    // Status validation
    if (!isUpdate || data.status !== undefined) {
      if (!data.status || typeof data.status !== 'string') {
        throw new Error('Status is required');
      }
      const validStatuses = ['pending', 'in_progress', 'completed', 'blocked', 'overdue'];
      if (!validStatuses.includes(data.status.toLowerCase())) {
        throw new Error(`Status must be one of: ${validStatuses.join(', ')}`);
      }
    }

    // Due Date validation
    if (!isUpdate || data.dueDate !== undefined) {
      if (data.dueDate !== undefined && data.dueDate !== null) {
        const date = new Date(data.dueDate);
        if (isNaN(date.getTime())) {
          throw new Error('Due date must be a valid date');
        }
      } else if (!isUpdate) {
        throw new Error('Due date is required');
      }
    }
  }
}
