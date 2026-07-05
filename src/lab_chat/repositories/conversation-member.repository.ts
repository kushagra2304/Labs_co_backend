import prisma from '../../prisma/client';
import { ConversationMember } from '@prisma/client';

export class ConversationMemberRepository {
  async findById(id: string, includeDeleted = false): Promise<ConversationMember | null> {
    return prisma.conversationMember.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async findByConversationAndUser(conversationId: string, userId: string, includeDeleted = false) {
    return prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      include: {
        user: true,
      },
    });
  }

  async findByConversation(conversationId: string, includeDeleted = false) {
    return prisma.conversationMember.findMany({
      where: {
        conversationId,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      include: {
        user: true,
      },
    });
  }

  async addMember(conversationId: string, userId: string, actorId?: string): Promise<ConversationMember> {
    // Check if member already exists (including soft-deleted)
    const existing = await this.findByConversationAndUser(conversationId, userId, true);
    if (existing) {
      if (existing.deletedAt) {
        // Restore soft-deleted member
        return prisma.conversationMember.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            deletedBy: null,
            joinedAt: new Date(),
            updatedBy: actorId,
          },
        });
      }
      return existing;
    }

    return prisma.conversationMember.create({
      data: {
        conversationId,
        userId,
        createdBy: actorId,
      },
    });
  }

  async removeMember(conversationId: string, userId: string, actorId: string): Promise<ConversationMember> {
    const existing = await prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new Error('Conversation member not found');
    }

    return prisma.conversationMember.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        deletedBy: actorId,
      },
    });
  }

  async updateLastReadAt(conversationId: string, userId: string): Promise<ConversationMember | null> {
    const member = await prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
        deletedAt: null,
      },
    });

    if (!member) return null;

    return prisma.conversationMember.update({
      where: { id: member.id },
      data: {
        lastReadAt: new Date(),
      },
    });
  }
}
