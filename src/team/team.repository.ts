import prisma from '../prisma/client';
import { User, Prisma, Role } from '@prisma/client';

export interface EmployeeFilters {
  department?: string;
  designation?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedEmployees {
  employees: User[];
  total: number;
  page: number;
  limit: number;
}

export interface TeamSummaryMetrics {
  total: number;
  departments: Array<{ name: string; count: number }>;
}

export class TeamRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async findByIdWithDetails(id: string): Promise<(User & {
    tasksAssigned: any[];
    activityLogs: any[];
  }) | null> {
    return prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        tasksAssigned: {
          where: { isDeleted: false, deletedAt: null },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        activityLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    }) as any;
  }

  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
        deletedAt: null,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        deletedAt: null,
      },
    });
  }

  async findNextEmployeeSeq(): Promise<number> {
    const count = await prisma.user.count({
      where: { role: Role.employee },
    });
    return count + 1;
  }

  async findAll(filters: EmployeeFilters): Promise<PaginatedEmployees> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.UserWhereInput = {
      role: Role.employee,
      deletedAt: null,
    };

    if (filters.department) {
      whereClause.department = filters.department;
    }

    if (filters.designation) {
      whereClause.designation = filters.designation;
    }

    if (filters.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }

    if (filters.startDate || filters.endDate) {
      whereClause.joinedDate = {};
      if (filters.startDate) {
        whereClause.joinedDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.joinedDate.lte = new Date(filters.endDate);
      }
    }

    if (filters.search) {
      const searchVal = filters.search.trim();
      whereClause.OR = [
        { name: { contains: searchVal, mode: 'insensitive' } },
        { username: { contains: searchVal, mode: 'insensitive' } },
        { email: { contains: searchVal, mode: 'insensitive' } },
        { phone: { contains: searchVal, mode: 'insensitive' } },
        { employeeId: { contains: searchVal, mode: 'insensitive' } },
      ];
    }

    // Determine sorting
    let orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: 'desc' };
    if (filters.sortBy) {
      const order = filters.sortOrder || 'asc';
      orderBy = {
        [filters.sortBy]: order,
      };
    }

    const [employees, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.user.count({
        where: whereClause,
      }),
    ]);

    return {
      employees,
      total,
      page,
      limit,
    };
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string, actorId: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actorId,
        isActive: false,
      },
    });
  }

  async getSummaryMetrics(): Promise<TeamSummaryMetrics> {
    const baseWhere = { role: Role.employee, deletedAt: null };

    // Get total active employees
    const total = await prisma.user.count({
      where: baseWhere,
    });

    // Get active departments
    const activeDepts = await prisma.department.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    // Count employees for each active department (handles both UUID and string name matching)
    const deptCounts = await Promise.all(
      activeDepts.map(async (dept) => {
        const count = await prisma.user.count({
          where: {
            ...baseWhere,
            OR: [
              { departmentId: dept.id },
              { department: { equals: dept.name, mode: 'insensitive' } }
            ]
          },
        });
        return {
          name: dept.name,
          count,
        };
      })
    );

    return {
      total,
      departments: deptCounts,
    };
  }
}
