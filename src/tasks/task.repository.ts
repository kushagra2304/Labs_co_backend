import prisma from '../prisma/client';
import { Task, Prisma, TaskStatus, Priority } from '@prisma/client';

export interface TaskFilters {
  employeeId?: string;
  status?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedTasks {
  tasks: (Task & {
    assignee: { id: string; name: string; email: string; avatarUrl: string | null } | null;
    assigner: { id: string; name: string; email: string } | null;
  })[];
  total: number;
  page: number;
  limit: number;
}

export class TaskRepository {
  async findById(id: string): Promise<(Task & {
    assignee: { id: string; name: string; email: string; avatarUrl: string | null } | null;
    assigner: { id: string; name: string; email: string } | null;
  }) | null> {
    return prisma.task.findFirst({
      where: {
        id,
        isDeleted: false,
        deletedAt: null,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
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

  async findAll(filters: TaskFilters): Promise<PaginatedTasks> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.TaskWhereInput = {
      isDeleted: false,
      deletedAt: null,
    };

    if (filters.employeeId) {
      whereClause.assignedTo = filters.employeeId;
    }

    if (filters.status) {
      whereClause.status = filters.status as TaskStatus;
    }

    if (filters.priority) {
      whereClause.priority = filters.priority as Priority;
    }

    if (filters.startDate || filters.endDate) {
      whereClause.dueDate = {};
      if (filters.startDate) {
        whereClause.dueDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.dueDate.lte = new Date(filters.endDate);
      }
    }

    if (filters.search) {
      const searchVal = filters.search.trim();
      const orConditions: Prisma.TaskWhereInput[] = [
        { title: { contains: searchVal, mode: 'insensitive' } },
        {
          assignee: {
            name: { contains: searchVal, mode: 'insensitive' },
          },
        },
        {
          assignee: {
            email: { contains: searchVal, mode: 'insensitive' },
          },
        },
      ];

      // Check if search query is a valid UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchVal);
      if (isUuid) {
        orConditions.push({ id: searchVal });
      }

      whereClause.OR = orConditions;
    }

    // Determine sorting
    let orderBy: Prisma.TaskOrderByWithRelationInput = { createdAt: 'desc' };
    if (filters.sortBy) {
      const order = filters.sortOrder || 'asc';
      if (filters.sortBy === 'assigneeName') {
        orderBy = {
          assignee: {
            name: order,
          },
        };
      } else if (filters.sortBy === 'createdBy') {
        orderBy = {
          assigner: {
            name: order,
          },
        };
      } else {
        orderBy = {
          [filters.sortBy]: order,
        };
      }
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
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
      }),
      prisma.task.count({
        where: whereClause,
      }),
    ]);

    return {
      tasks: tasks as any,
      total,
      page,
      limit,
    };
  }

  async create(data: {
    title: string;
    description: string;
    assignedTo: string;
    priority: Priority;
    status: TaskStatus;
    dueDate: Date | null;
    estimatedHours: number | null;
    actorId: string;
  }): Promise<Task> {
    return prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        assignedTo: data.assignedTo,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
        assignedBy: data.actorId,
        createdBy: data.actorId,
      },
    });
  }

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      assignedTo?: string;
      priority?: Priority;
      status?: TaskStatus;
      dueDate?: Date | null;
      estimatedHours?: number | null;
      dueSoonNotifiedAt?: null;
      overdueNotifiedAt?: null;
      actorId: string;
    }
  ): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
        ...(data.dueSoonNotifiedAt !== undefined && { dueSoonNotifiedAt: data.dueSoonNotifiedAt }),
        ...(data.overdueNotifiedAt !== undefined && { overdueNotifiedAt: data.overdueNotifiedAt }),
        updatedBy: data.actorId,
      },
    });
  }

  async softDelete(id: string, actorId: string): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: actorId,
      },
    });
  }

  async getLatestSubmission(taskId: string) {
    return prisma.taskSubmission.findFirst({
      where: { taskId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async finalize(id: string, adminId: string): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: {
        adminVerifiedAt: new Date(),
        adminVerifiedBy: adminId,
      },
    });
  }
}
