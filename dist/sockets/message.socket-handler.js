"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessageEvents = void 0;
const prisma_config_1 = __importDefault(require("../config/prisma.config"));
const handleMessageEvents = (io, socket, messageService) => {
    const userId = socket.data.user.id;
    socket.on('send_message', async ({ conversationId, content, type, replyToId, tempId }) => {
        try {
            if (!conversationId) {
                socket.emit('error', { message: 'conversationId is required' });
                return;
            }
            const message = await messageService.sendMessage({
                conversationId,
                senderId: userId,
                content,
                messageType: type || 'TEXT',
                replyToId,
            });
            const serializedMessage = {
                ...message,
                attachments: message.attachments?.map((att) => ({
                    ...att,
                    fileSizeBytes: att.fileSizeBytes.toString(),
                })),
            };
            // Emit to conversation room (for active chat screen)
            io.to(conversationId).emit('new_message', {
                message: serializedMessage,
                conversationId,
                tempId,
            });
            // Get all members of this conversation
            const members = await prisma_config_1.default.conversationMember.findMany({
                where: { conversationId, deletedAt: null },
                select: { userId: true },
            });
            // Emit to each member's personal room for real-time notifications/unreads
            for (const member of members) {
                io.to(member.userId).emit('new_message', {
                    message: serializedMessage,
                    conversationId,
                    tempId,
                });
            }
            socket.emit('message_ack', {
                tempId,
                messageId: message.id,
                status: 'SENT',
            });
        }
        catch (error) {
            console.error('Socket send_message error:', error);
            socket.emit('error', { message: error.message || 'Failed to send message' });
        }
    });
    socket.on('message_read', async ({ messageId, conversationId }) => {
        try {
            if (!messageId || !conversationId)
                return;
            await messageService.markAsRead(messageId, userId);
            io.to(conversationId).emit('read_receipt', {
                messageId,
                userId,
            });
        }
        catch (error) {
            console.error('Socket message_read error:', error);
        }
    });
};
exports.handleMessageEvents = handleMessageEvents;
