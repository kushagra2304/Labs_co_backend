"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationRepository = void 0;
const client_1 = __importDefault(require("../../prisma/client"));
const client_2 = require("@prisma/client");
class ConversationRepository {
    async findById(id, includeDeleted = false) {
        return client_1.default.conversation.findFirst({
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
    async findDirectConversation(userId1, userId2) {
        return client_1.default.conversation.findFirst({
            where: {
                type: client_2.ConversationType.DIRECT,
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
    async findUserConversations(userId, limit, offset, includeDeleted = false) {
        return client_1.default.conversation.findMany({
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
    async createDirect(userId1, userId2, actorId) {
        return client_1.default.$transaction(async (tx) => {
            const conversation = await tx.conversation.create({
                data: {
                    type: client_2.ConversationType.DIRECT,
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
    async createGroup(title, memberUserIds, actorId) {
        return client_1.default.$transaction(async (tx) => {
            const conversation = await tx.conversation.create({
                data: {
                    type: client_2.ConversationType.GROUP,
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
    async update(id, data, actorId) {
        return client_1.default.conversation.update({
            where: { id },
            data: {
                ...data,
                updatedBy: actorId,
            },
        });
    }
    async updateLastMessageAt(id) {
        return client_1.default.conversation.update({
            where: { id },
            data: {
                lastMessageAt: new Date(),
            },
        });
    }
    async softDelete(id, actorId) {
        return client_1.default.$transaction(async (tx) => {
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
exports.ConversationRepository = ConversationRepository;
