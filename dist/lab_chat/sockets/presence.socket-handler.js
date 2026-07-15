"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePresenceEvents = exports.handleUserDisconnect = exports.handleUserConnect = void 0;
const conversation_authorization_service_1 = require("../services/conversation-authorization.service");
const handleUserConnect = async (io, socket, presenceService) => {
    const userId = socket.data?.user?.id;
    if (!userId)
        return;
    socket.join(userId);
    const isNewOnline = await presenceService.setUserOnline(userId, socket.id);
    if (isNewOnline) {
        io.emit('user_online', { userId });
    }
};
exports.handleUserConnect = handleUserConnect;
const handleUserDisconnect = async (io, socket, presenceService) => {
    const userId = socket.data?.user?.id;
    if (!userId)
        return;
    const wasOnline = await presenceService.setUserOffline(userId, socket.id);
    if (wasOnline) {
        io.emit('user_offline', { userId });
    }
};
exports.handleUserDisconnect = handleUserDisconnect;
const handlePresenceEvents = (_io, socket, presenceService) => {
    const userId = socket.data.user.id;
    socket.on('join_room', async ({ conversationId }) => {
        if (conversationId) {
            const isAuth = await conversation_authorization_service_1.ConversationAuthorizationService.isAuthorized(conversationId, userId);
            if (isAuth) {
                socket.join(conversationId);
            }
            else {
                console.warn(`[SECURITY] Unauthorized join_room attempt by user ${userId} on conversation ${conversationId}`);
                socket.emit('error', { message: 'Unauthorized: You do not have access to this conversation.' });
            }
        }
    });
    socket.on('leave_room', async ({ conversationId }) => {
        if (conversationId) {
            const isAuth = await conversation_authorization_service_1.ConversationAuthorizationService.isAuthorized(conversationId, userId);
            if (isAuth) {
                socket.leave(conversationId);
            }
            else {
                socket.emit('error', { message: 'Unauthorized: You do not have access to this conversation.' });
            }
        }
    });
    socket.on('typing_start', async ({ conversationId }) => {
        if (!conversationId)
            return;
        const isAuth = await conversation_authorization_service_1.ConversationAuthorizationService.isAuthorized(conversationId, userId);
        if (!isAuth) {
            socket.emit('error', { message: 'Unauthorized: You do not have access to this conversation.' });
            return;
        }
        const isNewTyping = await presenceService.setUserTyping(conversationId, userId);
        if (isNewTyping) {
            socket.to(conversationId).emit('user_typing', { userId, conversationId });
        }
    });
    socket.on('typing_stop', async ({ conversationId }) => {
        if (!conversationId)
            return;
        const isAuth = await conversation_authorization_service_1.ConversationAuthorizationService.isAuthorized(conversationId, userId);
        if (!isAuth) {
            socket.emit('error', { message: 'Unauthorized: You do not have access to this conversation.' });
            return;
        }
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
