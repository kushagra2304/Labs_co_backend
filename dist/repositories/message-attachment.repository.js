"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageAttachmentRepository = void 0;
const prisma_config_1 = __importDefault(require("../config/prisma.config"));
class MessageAttachmentRepository {
    async findById(id, includeDeleted = false) {
        return prisma_config_1.default.messageAttachment.findFirst({
            where: {
                id,
                ...(includeDeleted ? {} : { deletedAt: null }),
            },
        });
    }
    async findByMessageId(messageId, includeDeleted = false) {
        return prisma_config_1.default.messageAttachment.findMany({
            where: {
                messageId,
                ...(includeDeleted ? {} : { deletedAt: null }),
            },
        });
    }
    async softDeleteAndMarkHardDeleted(id, actorId) {
        return prisma_config_1.default.messageAttachment.update({
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
    async softDeleteAllForMessage(messageId, actorId) {
        return prisma_config_1.default.messageAttachment.updateMany({
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
exports.MessageAttachmentRepository = MessageAttachmentRepository;
