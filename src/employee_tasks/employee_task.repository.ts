import prisma from '../prisma/client';
import { Task, Prisma, TaskStatus, Priority, TaskType, TaskUpdate } from '@prisma/client';

export interface EmployeeTaskFilters {
  status?: string;
  priority?: string;
  taskType?: string;
  dueDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class EmployeeTaskRepository {
  async findById(id: string): Promise<(Task & {
    taskUpdates: (TaskUpdate & {
      updater: { id: string; name: string; email: string } | null;
    })[];
    assignee: { id: string; name: string; email: string } | null;
    assigner: { id: string; name: string; email: string } | null;
  }) | null> {
    return prisma.task.findFirst({
      where: {
        id,
        isDeleted: false,
        deletedAt: null,
      },
      include: {
        taskUpdates: {
          orderBy: { createdAt: 'desc' },
          include: {
            updater: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assigner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }) as any;
  }

  async findAll(employeeId: string, filters: EmployeeTaskFilters): Promise<Task[]> {
    // Base filter: Employee must be assignee for ADMIN_ASSIGNED, or creator for PERSONAL
    const whereClause: Prisma.TaskWhereInput = {
      isDeleted: false,
      deletedAt: null,
      OR: [
        { assignedTo: employeeId, taskType: TaskType.ADMIN_ASSIGNED },
        { createdBy: employeeId, taskType: TaskType.PERSONAL },
      ],
    };

    // Apply Filters
    if (filters.taskType) {
      whereClause.taskType = filters.taskType as TaskType;
    }

    if (filters.status) {
      whereClause.status = filters.status as TaskStatus;
    }

    if (filters.priority) {
      whereClause.priority = filters.priority as Priority;
    }

    if (filters.dueDate) {
      const d = new Date(filters.dueDate);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      whereClause.dueDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (filters.search) {
      const searchVal = filters.search.trim();
      whereClause.AND = [
        {
          OR: [
            { title: { contains: searchVal, mode: 'insensitive' } },
            { description: { contains: searchVal, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // Determine sorting
    let orderBy: Prisma.TaskOrderByWithRelationInput = { createdAt: 'desc' };
    if (filters.sortBy) {
      const order = filters.sortOrder || 'asc';
      orderBy = {
        [filters.sortBy]: order,
      };
    }

    return prisma.task.findMany({
      where: whereClause,
      orderBy,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        assigner: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async createPersonal(data: {
    title: string;
    description: string;
    priority: Priority;
    dueDate: Date | null;
    estimatedHours: number | null;
    employeeId: string;
  }): Promise<Task> {
    return prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
        taskType: TaskType.PERSONAL,
        status: TaskStatus.pending,
        assignedTo: data.employeeId,
        createdBy: data.employeeId,
      },
    });
  }

  async updatePersonal(
    id: string,
    data: {
      title?: string;
      description?: string;
      priority?: Priority;
      dueDate?: Date | null;
      estimatedHours?: number | null;
      status?: TaskStatus;
      completedAt?: Date | null;
    }
  ): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
      },
    });
  }

  async softDeletePersonal(id: string, employeeId: string): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: employeeId,
      },
    });
  }

  async updateStatus(id: string, status: TaskStatus, completedAt: Date | null): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt,
      },
    });
  }

  async createProgressUpdate(taskId: string, employeeId: string, note: string): Promise<TaskUpdate> {
    return prisma.taskUpdate.create({
      data: {
        taskId,
        updatedById: employeeId,
        note,
      },
      include: {
        updater: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }) as any;
  }
}
