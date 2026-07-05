"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const require_auth_middleware_1 = require("../../lab_auth/middleware/require-auth.middleware");
const media_upload_middleware_1 = require("../middleware/media-upload.middleware");
const user_controller_1 = require("../controllers/user.controller");
const conversation_controller_1 = require("../controllers/conversation.controller");
const message_controller_1 = require("../controllers/message.controller");
const media_controller_1 = require("../controllers/media.controller");
const router = (0, express_1.Router)();
const userController = new user_controller_1.UserController();
const conversationController = new conversation_controller_1.ConversationController();
const messageController = new message_controller_1.MessageController();
const mediaController = new media_controller_1.MediaController();
// Health route (does not require authentication)
router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
// Secure all other routes with the requireAuth stub
router.use(require_auth_middleware_1.requireAuth);
// Employee list
router.get('/users', userController.getChatUsers);
// Conversations
router.get('/conversations', conversationController.getMyConversations);
router.post('/conversations', conversationController.createConversation);
router.get('/conversations/:conversationId/messages', conversationController.getConversationMessages);
// Messages
router.patch('/messages/:messageId', messageController.editMessage);
router.delete('/messages/:messageId', messageController.deleteMessage);
// Reactions
router.post('/messages/:messageId/reactions', messageController.addReaction);
router.delete('/messages/:messageId/reactions/:reactionId', messageController.deleteReaction);
// Media Upload
router.post('/media/upload', media_upload_middleware_1.uploadChatMedia, mediaController.uploadFile);
exports.default = router;
