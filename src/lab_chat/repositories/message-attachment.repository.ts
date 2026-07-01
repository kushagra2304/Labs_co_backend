import prisma from '../../prisma/client';
import { MessageAttachment } from '@prisma/client';

export class MessageAttachmentRepository {
  async findById(id: string, includeDeleted = false): Promise<MessageAttachment | null> {
    return prisma.messageAttachment.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async findByMessageId(messageId: string, includeDeleted = false): Promise<MessageAttachment[]> {
    return prisma.messageAttachment.findMany({
      where: {
        messageId,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async softDeleteAndMarkHardDeleted(id: string, actorId: string): Promise<MessageAttachment> {
    return prisma.messageAttachment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actorId,
        r2HardDeleted: true,
        r2DeletedAt: new Date(),
        updatedBy: actorId,
      },
    });
  }

  async softDeleteAllForMessage(messageId: string, actorId: string) {
    return prisma.messageAttachment.updateMany({
      where: {
        messageId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        deletedBy: actorId,
      },
    });
  }
}
