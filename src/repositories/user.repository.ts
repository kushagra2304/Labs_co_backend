import prisma from '../config/prisma.config';
import { User, Prisma } from '@prisma/client';

export class UserRepository {
  async findById(id: string, includeDeleted = false): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async findByEmail(email: string, includeDeleted = false): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        email,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async findAll(includeDeleted = false): Promise<User[]> {
    return prisma.user.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findActiveEmployeesExcept(currentUserId: string): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isActive: true,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: Omit<Prisma.UserCreateInput, 'createdAt' | 'updatedAt' | 'deletedAt'>, actorId?: string): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        createdBy: actorId,
      },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput, actorId?: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedBy: actorId,
      },
    });
  }

  async softDelete(id: string, actorId: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actorId,
      },
    });
  }
}
