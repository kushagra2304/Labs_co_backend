"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePresenceEvents = exports.handleUserDisconnect = exports.handleUserConnect = void 0;
const handleUserConnect = async (io, socket, presenceService) => {
    const userId = socket.data.user.id;
    const isNewOnline = await presenceService.setUserOnline(userId);
    if (isNewOnline) {
        io.emit('user_online', { userId });
    }
};
exports.handleUserConnect = handleUserConnect;
const handleUserDisconnect = async (io, socket, presenceService) => {
    const userId = socket.data.user.id;
    const wasOnline = await presenceService.setUserOffline(userId);
    if (wasOnline) {
        io.emit('user_offline', { userId });
    }
};
exports.handleUserDisconnect = handleUserDisconnect;
const handlePresenceEvents = (_io, socket, presenceService) => {
    const userId = socket.data.user.id;
    socket.on('join_room', ({ conversationId }) => {
        if (conversationId) {
            socket.join(conversationId);
        }
    });
    socket.on('leave_room', ({ conversationId }) => {
        if (conversationId) {
            socket.leave(conversationId);
        }
    });
    socket.on('typing_start', async ({ conversationId }) => {
        if (!conversationId)
            return;
        const isNewTyping = await presenceService.setUserTyping(conversationId, userId);
        if (isNewTyping) {
            socket.to(conversationId).emit('user_typing', { userId, conversationId });
        }
    });
    socket.on('typing_stop', async ({ conversationId }) => {
        if (!conversationId)
            return;
        const wasTyping = await presenceService.setUserStoppedTyping(conversationId, userId);
        if (wasTyping) {
            socket.to(conversationId).emit('user_stopped_typing', { userId, conversationId });
        }
    });
    socket.on('heartbeat', async () => {
        await presenceService.heartbeat(userId);
    });
};
exports.handlePresenceEvents = handlePresenceEvents;
