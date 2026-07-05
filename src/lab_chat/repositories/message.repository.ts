import prisma from '../../prisma/client';
import { MessageType, MessageStatus } from '@prisma/client';

export class MessageRepository {
  async findById(id: string, includeDeleted = false) {
    return prisma.message.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      include: {
        sender: true,
        attachments: {
          where: includeDeleted ? {} : { deletedAt: null },
        },
        reactions: {
          where: includeDeleted ? {} : { deletedAt: null },
          include: {
            user: true,
          },
        },
        replyTo: {
          include: {
            sender: true,
          },
        },
      },
    });
  }

  async findConversationMessages(conversationId: string, limit: number, offset: number, includeDeleted = false) {
    return prisma.message.findMany({
      where: {
        conversationId,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      include: {
        sender: true,
        attachments: {
          where: includeDeleted ? {} : { deletedAt: null },
        },
        reactions: {
          where: includeDeleted ? {} : { deletedAt: null },
          include: {
            user: true,
          },
        },
        replyTo: {
          include: {
            sender: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }

  async create(data: {
    conversationId: string;
    senderId: string;
    content?: string;
    messageType: MessageType;
    replyToId?: string;
    attachments?: {
      fileName: string;
      fileType: string;
      fileSizeBytes: bigint;
      r2ObjectKey: string;
      cdnUrl: string;
    }[];
  }, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId: data.conversationId,
          senderId: data.senderId,
          content: data.content,
          messageType: data.messageType,
          replyToId: data.replyToId,
          createdBy: actorId,
          attachments: data.attachments ? {
            create: data.attachments.map((att) => ({
              fileName: att.fileName,
              fileType: att.fileType,
              fileSizeBytes: att.fileSizeBytes,
              r2ObjectKey: att.r2ObjectKey,
              cdnUrl: att.cdnUrl,
              createdBy: actorId,
            })),
          } : undefined,
        },
        include: {
          sender: true,
          attachments: true,
          reactions: {
            include: {
              user: true,
            },
          },
          replyTo: {
            include: {
              sender: true,
            },
          },
        },
      });

      // Update the lastMessageAt of the conversation
      await tx.conversation.update({
        where: { id: data.conversationId },
        data: { lastMessageAt: new Date() },
      });

      return message;
    });
  }

  async updateContent(id: string, content: string, actorId: string) {
    return prisma.message.update({
      where: { id },
      data: {
        content,
        updatedBy: actorId,
      },
      include: {
        sender: true,
        attachments: {
          where: { deletedAt: null },
        },
        reactions: {
          where: { deletedAt: null },
          include: {
            user: true,
          },
        },
        replyTo: {
          include: {
            sender: true,
          },
        },
      },
    });
  }

  async updateStatus(id: string, status: MessageStatus) {
    return prisma.message.update({
      where: { id },
      data: {
        status,
      },
    });
  }

  async findUnreadBySender(conversationId: string, excludeSenderId: string) {
    return prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: excludeSenderId },
        status: { not: 'READ' },
        deletedAt: null,
      },
      select: { id: true, senderId: true },
    });
  }

  async bulkUpdateStatus(ids: string[], status: MessageStatus) {
    return prisma.message.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
  }

  async softDelete(id: string, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const message = await tx.message.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: actorId,
        },
        include: {
          attachments: true,
        },
      });

      // Soft-delete the attachments in DB
      await tx.messageAttachment.updateMany({
        where: { messageId: id, deletedAt: null },
        data: {
          deletedAt: new Date(),
          deletedBy: actorId,
        },
      });

      return message;
    });
  }
}
