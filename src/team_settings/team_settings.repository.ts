import prisma from '../prisma/client';
import { Department } from '@prisma/client';

export type MasterModelName = 'department' | 'designation';

export interface IMasterCreateInput {
  name: string;
  description?: string | null;
  isActive?: boolean;
  displayOrder?: number;
  createdBy?: string;
  departmentId?: string | null; // specific for designations
}

export interface IMasterUpdateInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  displayOrder?: number;
  updatedBy?: string;
  departmentId?: string | null;
}

export interface IMasterEntity {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  departmentId?: string | null; // specific for designations
  department?: Department | null; // specific for designations
}

export class MasterRepository {
  constructor(private modelName: MasterModelName) {}

  private get delegate() {
    return prisma[this.modelName] as any;
  }

  async findById(id: string): Promise<IMasterEntity | null> {
    return this.delegate.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      ...(this.modelName === 'designation' ? { include: { department: true } } : {}),
    });
  }

  async findByName(name: string): Promise<IMasterEntity | null> {
    return this.delegate.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        deletedAt: null,
      },
    });
  }

  async findAll(params: {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    departmentId?: string;
  }): Promise<{ items: IMasterEntity[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      deletedAt: null,
    };

    if (params.isActive !== undefined) {
      whereClause.isActive = params.isActive;
    }

    if (params.search) {
      whereClause.name = {
        contains: params.search.trim(),
        mode: 'insensitive',
      };
    }

    if (params.departmentId !== undefined && params.departmentId !== '') {
      whereClause.departmentId = params.departmentId;
    }

    let orderBy: any = { displayOrder: 'asc' };
    if (params.sortBy) {
      orderBy = {
        [params.sortBy]: params.sortOrder || 'asc',
      };
    }

    const [items, total] = await Promise.all([
      this.delegate.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
        ...(this.modelName === 'designation' ? { include: { department: true } } : {}),
      }),
      this.delegate.count({
        where: whereClause,
      }),
    ]);

    return { items, total };
  }

  async create(data: IMasterCreateInput): Promise<IMasterEntity> {
    return this.delegate.create({
      data,
    });
  }

  async update(id: string, data: IMasterUpdateInput): Promise<IMasterEntity> {
    return this.delegate.update({
      where: { id },
      data,
      ...(this.modelName === 'designation' ? { include: { department: true } } : {}),
    });
  }

  async softDelete(id: string, actorId: string): Promise<IMasterEntity> {
    return this.delegate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actorId,
        isActive: false,
      },
    });
  }
}
