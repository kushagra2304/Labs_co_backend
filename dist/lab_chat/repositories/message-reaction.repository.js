"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageReactionRepository = void 0;
const client_1 = __importDefault(require("../../prisma/client"));
class MessageReactionRepository {
    async findById(id, includeDeleted = false) {
        return client_1.default.messageReaction.findFirst({
            where: {
                id,
                ...(includeDeleted ? {} : { deletedAt: null }),
            },
        });
    }
    async findByMessageAndUserAndEmoji(messageId, userId, emoji, includeDeleted = false) {
        return client_1.default.messageReaction.findFirst({
            where: {
                messageId,
                userId,
                emoji,
                ...(includeDeleted ? {} : { deletedAt: null }),
            },
        });
    }
    async createOrRestore(messageId, userId, emoji, actorId) {
        const existing = await this.findByMessageAndUserAndEmoji(messageId, userId, emoji, true);
        if (existing) {
            if (existing.deletedAt) {
                return client_1.default.messageReaction.update({
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
        return client_1.default.messageReaction.create({
            data: {
                messageId,
                userId,
                emoji,
                createdBy: actorId,
            },
        });
    }
    async softDelete(id, actorId) {
        return client_1.default.messageReaction.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                deletedBy: actorId,
            },
        });
    }
}
exports.MessageReactionRepository = MessageReactionRepository;
