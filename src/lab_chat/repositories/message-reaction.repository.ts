import prisma from '../../prisma/client';
import { MessageReaction } from '@prisma/client';

export class MessageReactionRepository {
  async findById(id: string, includeDeleted = false): Promise<MessageReaction | null> {
    return prisma.messageReaction.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async findByMessageAndUserAndEmoji(
    messageId: string,
    userId: string,
    emoji: string,
    includeDeleted = false
  ): Promise<MessageReaction | null> {
    return prisma.messageReaction.findFirst({
      where: {
        messageId,
        userId,
        emoji,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async createOrRestore(messageId: string, userId: string, emoji: string, actorId?: string): Promise<MessageReaction> {
    const existing = await this.findByMessageAndUserAndEmoji(messageId, userId, emoji, true);

    if (existing) {
      if (existing.deletedAt) {
        return prisma.messageReaction.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            deletedBy: null,
            updatedBy: actorId,
          },
        });
      }
      return existing;
    }

    return prisma.messageReaction.create({
      data: {
        messageId,
        userId,
        emoji,
        createdBy: actorId,
      },
    });
  }

  async softDelete(id: string, actorId: string): Promise<MessageReaction> {
    return prisma.messageReaction.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actorId,
      },
    });
  }
}
