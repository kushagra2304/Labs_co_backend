import { Request, Response } from 'express';
import { ConversationService } from '../services/conversation.service';
import { MessageService } from '../services/message.service';

export class ConversationController {
  constructor(
    private conversationService = new ConversationService(),
    private messageService = new MessageService()
  ) {}

  getMyConversations = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const conversations = await this.conversationService.getConversations(userId, page, limit);
      res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch conversations',
      });
    }
  };

  createConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { type, targetUserId, title, memberUserIds } = req.body;

      if (type === 'DIRECT') {
        if (!targetUserId) {
          res.status(400).json({ success: false, error: 'targetUserId is required for DIRECT conversations' });
          return;
        }
        const conversation = await this.conversationService.createOrGetDirectConversation(userId, targetUserId);
        res.status(200).json({ success: true, data: conversation });
        return;
      } else if (type === 'GROUP') {
        if (!title) {
          res.status(400).json({ success: false, error: 'title is required for GROUP conversations' });
          return;
        }
        const members = Array.isArray(memberUserIds) ? memberUserIds : [];
        const conversation = await this.conversationService.createGroupConversation(title, members, userId);
        res.status(201).json({ success: true, data: conversation });
        return;
      } else {
        res.status(400).json({ success: false, error: 'Invalid conversation type. Must be DIRECT or GROUP' });
        return;
      }
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create conversation',
      });
    }
  };

  getConversationMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const conversationId = req.params.conversationId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const messages = await this.messageService.getConversationMessages(conversationId, userId, page, limit);
      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to fetch messages',
      });
    }
  };
}
