"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationAuthorizationService = void 0;
const client_1 = __importDefault(require("../../prisma/client"));
class ConversationAuthorizationService {
    /**
     * Helper to check if a string is a valid UUID to prevent database errors.
     */
    static isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
    /**
     * Validates if a user is a member of a conversation, and the conversation is active.
     */
    static async isAuthorized(conversationId, userId) {
        if (!conversationId || !userId) {
            return false;
        }
        if (!this.isValidUUID(conversationId) || !this.isValidUUID(userId)) {
            return false;
        }
        try {
            // Find the conversation and check its status
            const conversation = await client_1.default.conversation.findFirst({
                where: {
                    id: conversationId,
                    deletedAt: null,
                },
                select: {
                    id: true,
                    status: true,
                },
            });
            if (!conversation) {
                return false;
            }
            // Check if conversation status is CLOSED (not active)
            if (conversation.status === 'CLOSED') {
                return false;
            }
            // Find the member record
            const member = await client_1.default.conversationMember.findFirst({
                where: {
                    conversationId,
                    userId,
                    deletedAt: null,
                },
                select: {
                    id: true,
                },
            });
            return !!member;
        }
        catch (error) {
            console.error(`Authorization check failed for user ${userId} on conversation ${conversationId}:`, error);
            return false;
        }
    }
    /**
     * Checks authorization based on a messageId.
     */
    static async isMessageAuthorized(messageId, userId) {
        if (!messageId || !userId) {
            return false;
        }
        if (!this.isValidUUID(messageId) || !this.isValidUUID(userId)) {
            return false;
        }
        try {
            const message = await client_1.default.message.findFirst({
                where: {
                    id: messageId,
                    deletedAt: null,
                },
                select: {
                    conversationId: true,
                },
            });
            if (!message) {
                return false;
            }
            return this.isAuthorized(message.conversationId, userId);
        }
        catch (error) {
            console.error(`Message authorization check failed for user ${userId} on message ${messageId}:`, error);
            return false;
        }
    }
}
exports.ConversationAuthorizationService = ConversationAuthorizationService;
