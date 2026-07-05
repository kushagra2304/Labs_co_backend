import { MessageRepository } from '../repositories/message.repository';
import { ConversationMemberRepository } from '../repositories/conversation-member.repository';
import { MessageAttachmentRepository } from '../repositories/message-attachment.repository';
import { MessageReactionRepository } from '../repositories/message-reaction.repository';
import { MediaService } from './media.service';

export class MessageService {
  constructor(
    private messageRepo = new MessageRepository(),
    private memberRepo = new ConversationMemberRepository(),
    private attachmentRepo = new MessageAttachmentRepository(),
    private reactionRepo = new MessageReactionRepository(),
    private mediaService = new MediaService()
  ) {}

  async getConversationMessages(conversationId: string, userId: string, page: number, limit: number) {
    const member = await this.memberRepo.findByConversationAndUser(conversationId, userId);
    if (!member) {
      throw new Error('You are not a member of this conversation');
    }

    const offset = (page - 1) * limit;
    return this.messageRepo.findConversationMessages(conversationId, limit, offset, true);
  }

  async sendMessage(data: {
    conversationId: string;
    senderId: string;
    content?: string;
    messageType: any;
    replyToId?: string;
    attachments?: {
      fileName: string;
      fileType: string;
      fileSizeBytes: bigint;
      r2ObjectKey: string;
      cdnUrl: string;
    }[];
  }) {
    const member = await this.memberRepo.findByConversationAndUser(data.conversationId, data.senderId);
    if (!member) {
      throw new Error('Sender is not a member of the conversation');
    }

    if (data.replyToId) {
      const replyToMsg = await this.messageRepo.findById(data.replyToId);
      if (!replyToMsg) {
        throw new Error('Message to reply to does not exist');
      }
    }

    return this.messageRepo.create(data, data.senderId);
  }

  async editMessage(messageId: string, userId: string, content: string) {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('You can only edit your own messages');
    }

    return this.messageRepo.updateContent(messageId, content, userId);
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('You can only delete your own messages');
    }

    if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        try {
          await this.mediaService.deleteFile(attachment.r2ObjectKey);
        } catch (error) {
          console.error(`Failed to delete file from R2: ${attachment.r2ObjectKey}`, error);
        }
        await this.attachmentRepo.softDeleteAndMarkHardDeleted(attachment.id, userId);
      }
    }

    return this.messageRepo.softDelete(messageId, userId);
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const member = await this.memberRepo.findByConversationAndUser(message.conversationId, userId);
    if (!member) {
      throw new Error('You must be a member of the conversation to react');
    }

    const reaction = await this.reactionRepo.createOrRestore(messageId, userId, emoji, userId);
    return {
      reaction,
      conversationId: message.conversationId,
    };
  }

  async deleteReaction(_messageId: string, reactionId: string, userId: string) {
    const reaction = await this.reactionRepo.findById(reactionId);
    if (!reaction) {
      throw new Error('Reaction not found');
    }

    if (reaction.userId !== userId) {
      throw new Error('You can only delete your own reactions');
    }

    const deletedReaction = await this.reactionRepo.softDelete(reactionId, userId);
    const message = await this.messageRepo.findById(deletedReaction.messageId);
    
    return {
      reaction: deletedReaction,
      conversationId: message ? message.conversationId : '',
      messageId: deletedReaction.messageId,
    };
  }


  async markAsRead(messageId: string, userId: string) {
    const message = await this.messageRepo.findById(messageId);
    if (!message) return { id: messageId, senderId: '' };

    if (message.senderId === userId) {
      return { id: messageId, senderId: userId };
    }

    await this.memberRepo.updateLastReadAt(message.conversationId, userId);
    const updated = await this.messageRepo.updateStatus(messageId, 'READ');
    // Return object with senderId so the socket handler can notify the correct sender
    return { id: updated.id, senderId: message.senderId };
  }

  async markConversationAsRead(conversationId: string, userId: string) {
    // Find all messages in this conversation not sent by the current user that are not yet READ
    const unread = await this.messageRepo.findUnreadBySender(conversationId, userId);
    if (unread.length === 0) return [];

    // Bulk update to READ
    await this.messageRepo.bulkUpdateStatus(
      unread.map((m) => m.id),
      'READ'
    );

    // Update lastReadAt for the member
    await this.memberRepo.updateLastReadAt(conversationId, userId);

    // Return only the fields the socket handler needs
    return unread.map((m) => ({ id: m.id, senderId: m.senderId }));
  }
}
