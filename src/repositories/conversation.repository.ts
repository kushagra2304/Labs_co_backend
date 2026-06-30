import prisma from '../config/prisma.config';
import { Prisma, ConversationType } from '@prisma/client';

export class ConversationRepository {
  async findById(id: string, includeDeleted = false) {
    return prisma.conversation.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      include: {
        members: {
          where: includeDeleted ? {} : { deletedAt: null },
          include: {
            user: true,
          },
        },
      },
    });
  }

  async findDirectConversation(userId1: string, userId2: string) {
    return prisma.conversation.findFirst({
      where: {
        type: ConversationType.DIRECT,
        deletedAt: null,
        AND: [
          { members: { some: { userId: userId1, deletedAt: null } } },
          { members: { some: { userId: userId2, deletedAt: null } } },
        ],
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async findUserConversations(userId: string, limit: number, offset: number, includeDeleted = false) {
    return prisma.conversation.findMany({
      where: {
        ...(includeDeleted ? {} : { deletedAt: null }),
        members: {
          some: {
            userId,
            ...(includeDeleted ? {} : { deletedAt: null }),
          },
        },
      },
      include: {
        members: {
          where: includeDeleted ? {} : { deletedAt: null },
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }

  async createDirect(userId1: string, userId2: string, actorId?: string) {
    return prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: {
          type: ConversationType.DIRECT,
          createdBy: actorId,
          members: {
            create: [
              { userId: userId1, createdBy: actorId },
              { userId: userId2, createdBy: actorId },
            ],
          },
        },
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
      });
      return conversation;
    });
  }

  async createGroup(title: string, memberUserIds: string[], actorId?: string) {
    return prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: {
          type: ConversationType.GROUP,
          title,
          createdBy: actorId,
          members: {
            create: memberUserIds.map((userId) => ({
              userId,
              createdBy: actorId,
            })),
          },
        },
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
      });
      return conversation;
    });
  }

  async update(id: string, data: Prisma.ConversationUpdateInput, actorId?: string) {
    return prisma.conversation.update({
      where: { id },
      data: {
        ...data,
        updatedBy: actorId,
      },
    });
  }

  async updateLastMessageAt(id: string) {
    return prisma.conversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
      },
    });
  }

  async softDelete(id: string, actorId: string) {
    return prisma.$transaction(async (tx) => {
      // Soft-delete the conversation
      const conversation = await tx.conversation.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: actorId,
        },
      });

      // Soft-delete members of this conversation
      await tx.conversationMember.updateMany({
        where: { conversationId: id, deletedAt: null },
        data: {
          deletedAt: new Date(),
          deletedBy: actorId,
        },
      });

      return conversation;
    });
  }
}
