import { Router } from 'express';
import { requireAuth } from '../../lab_auth/middleware/require-auth.middleware';
import { uploadChatMedia } from '../middleware/media-upload.middleware';
import { UserController } from '../controllers/user.controller';
import { ConversationController } from '../controllers/conversation.controller';
import { MessageController } from '../controllers/message.controller';
import { MediaController } from '../controllers/media.controller';

const router = Router();

const userController = new UserController();
const conversationController = new ConversationController();
const messageController = new MessageController();
const mediaController = new MediaController();

// Health route (does not require authentication)
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Secure all other routes with the requireAuth stub
router.use(requireAuth);

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
router.post('/media/upload', uploadChatMedia, mediaController.uploadFile);

export default router;
