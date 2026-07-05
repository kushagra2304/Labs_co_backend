"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationMemberRepository = void 0;
const prisma_config_1 = __importDefault(require("../config/prisma.config"));
class ConversationMemberRepository {
    async findById(id, includeDeleted = false) {
        return prisma_config_1.default.conversationMember.findFirst({
            where: {
                id,
                ...(includeDeleted ? {} : { deletedAt: null }),
            },
        });
    }
    async findByConversationAndUser(conversationId, userId, includeDeleted = false) {
        return prisma_config_1.default.conversationMember.findFirst({
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
    async findByConversation(conversationId, includeDeleted = false) {
        return prisma_config_1.default.conversationMember.findMany({
            where: {
                conversationId,
                ...(includeDeleted ? {} : { deletedAt: null }),
            },
            include: {
                user: true,
            },
        });
    }
    async addMember(conversationId, userId, actorId) {
        // Check if member already exists (including soft-deleted)
        const existing = await this.findByConversationAndUser(conversationId, userId, true);
        if (existing) {
            if (existing.deletedAt) {
                // Restore soft-deleted member
                return prisma_config_1.default.conversationMember.update({
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
        return prisma_config_1.default.conversationMember.create({
            data: {
                conversationId,
                userId,
                createdBy: actorId,
            },
        });
    }
    async removeMember(conversationId, userId, actorId) {
        const existing = await prisma_config_1.default.conversationMember.findFirst({
            where: {
                conversationId,
                userId,
                deletedAt: null,
            },
        });
        if (!existing) {
            throw new Error('Conversation member not found');
        }
        return prisma_config_1.default.conversationMember.update({
            where: { id: existing.id },
            data: {
                deletedAt: new Date(),
                deletedBy: actorId,
            },
        });
    }
    async updateLastReadAt(conversationId, userId) {
        const member = await prisma_config_1.default.conversationMember.findFirst({
            where: {
                conversationId,
                userId,
                deletedAt: null,
            },
        });
        if (!member)
            return null;
        return prisma_config_1.default.conversationMember.update({
            where: { id: member.id },
            data: {
                lastReadAt: new Date(),
            },
        });
    }
}
exports.ConversationMemberRepository = ConversationMemberRepository;
