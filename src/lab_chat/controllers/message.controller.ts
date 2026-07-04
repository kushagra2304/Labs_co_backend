import { Request, Response } from 'express';
import { MessageService } from '../services/message.service';
import prisma from '../../prisma/client';

export class MessageController {
  constructor(private messageService = new MessageService()) {}

  editMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const messageId = req.params.messageId as string;
      const { content } = req.body;

      if (!content || content.trim() === '') {
        res.status(400).json({ success: false, error: 'Content is required to edit message' });
        return;
      }

      const message = await this.messageService.editMessage(messageId, userId, content);

      const io = req.app.get('io');
      if (io) {
        const conversationId = message.conversationId;
        io.to(conversationId).emit('message_edited', {
          messageId,
          content,
          conversationId,
          updatedAt: message.updatedAt,
        });

        // Query members to emit to their personal rooms
        const members = await prisma.conversationMember.findMany({
          where: { conversationId, deletedAt: null },
          select: { userId: true },
        });

        for (const member of members) {
          io.to(member.userId).emit('message_edited', {
            messageId,
            content,
            conversationId,
            updatedAt: message.updatedAt,
          });
        }
      }

      res.status(200).json({
        success: true,
        data: message,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to edit message',
      });
    }
  };

  deleteMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const messageId = req.params.messageId as string;

      const message = await this.messageService.deleteMessage(messageId, userId);

      const io = req.app.get('io');
      if (io) {
        const conversationId = message.conversationId;
        io.to(conversationId).emit('message_deleted', {
          messageId,
          conversationId,
          deletedAt: message.deletedAt,
        });

        // Query members to emit to their personal rooms
        const members = await prisma.conversationMember.findMany({
          where: { conversationId, deletedAt: null },
          select: { userId: true },
        });

        for (const member of members) {
          io.to(member.userId).emit('message_deleted', {
            messageId,
            conversationId,
            deletedAt: message.deletedAt,
          });
        }
      }

      res.status(200).json({
        success: true,
        data: message,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete message',
      });
    }
  };

  addReaction = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const messageId = req.params.messageId as string;
      const { emoji } = req.body;

      if (!emoji) {
        res.status(400).json({ success: false, error: 'Emoji is required to react' });
        return;
      }

      const { reaction, conversationId } = await this.messageService.addReaction(messageId, userId, emoji);

      const io = req.app.get('io');
      if (io) {
        io.to(conversationId).emit('reaction_added', {
          messageId,
          reaction,
          conversationId,
        });

        // Query members to emit to their personal rooms
        const members = await prisma.conversationMember.findMany({
          where: { conversationId, deletedAt: null },
          select: { userId: true },
        });

        for (const member of members) {
          io.to(member.userId).emit('reaction_added', {
            messageId,
            reaction,
            conversationId,
          });
        }
      }

      res.status(200).json({
        success: true,
        data: reaction,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to add reaction',
      });
    }
  };

  deleteReaction = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const messageId = req.params.messageId as string;
      const reactionId = req.params.reactionId as string;

      const { reaction, conversationId } = await this.messageService.deleteReaction(messageId, reactionId, userId);

      const io = req.app.get('io');
      if (io) {
        io.to(conversationId).emit('reaction_removed', {
          messageId,
          reactionId,
          conversationId,
        });

        // Query members to emit to their personal rooms
        const members = await prisma.conversationMember.findMany({
          where: { conversationId, deletedAt: null },
          select: { userId: true },
        });

        for (const member of members) {
          io.to(member.userId).emit('reaction_removed', {
            messageId,
            reactionId,
            conversationId,
          });
        }
      }

      res.status(200).json({
        success: true,
        data: reaction,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete reaction',
      });
    }
  };
}
