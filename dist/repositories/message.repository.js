"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageRepository = void 0;
const prisma_config_1 = __importDefault(require("../config/prisma.config"));
class MessageRepository {
    async findById(id, includeDeleted = false) {
        return prisma_config_1.default.message.findFirst({
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
    async findConversationMessages(conversationId, limit, offset, includeDeleted = false) {
        return prisma_config_1.default.message.findMany({
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
    async create(data, actorId) {
        return prisma_config_1.default.$transaction(async (tx) => {
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
    async updateContent(id, content, actorId) {
        return prisma_config_1.default.message.update({
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
    async updateStatus(id, status) {
        return prisma_config_1.default.message.update({
            where: { id },
            data: {
                status,
            },
        });
    }
    async softDelete(id, actorId) {
        return prisma_config_1.default.$transaction(async (tx) => {
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
exports.MessageRepository = MessageRepository;
