"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageService = void 0;
const message_repository_1 = require("../repositories/message.repository");
const conversation_member_repository_1 = require("../repositories/conversation-member.repository");
const message_attachment_repository_1 = require("../repositories/message-attachment.repository");
const message_reaction_repository_1 = require("../repositories/message-reaction.repository");
const media_service_1 = require("./media.service");
class MessageService {
    messageRepo;
    memberRepo;
    attachmentRepo;
    reactionRepo;
    mediaService;
    constructor(messageRepo = new message_repository_1.MessageRepository(), memberRepo = new conversation_member_repository_1.ConversationMemberRepository(), attachmentRepo = new message_attachment_repository_1.MessageAttachmentRepository(), reactionRepo = new message_reaction_repository_1.MessageReactionRepository(), mediaService = new media_service_1.MediaService()) {
        this.messageRepo = messageRepo;
        this.memberRepo = memberRepo;
        this.attachmentRepo = attachmentRepo;
        this.reactionRepo = reactionRepo;
        this.mediaService = mediaService;
    }
    async getConversationMessages(conversationId, userId, page, limit) {
        const member = await this.memberRepo.findByConversationAndUser(conversationId, userId);
        if (!member) {
            throw new Error('You are not a member of this conversation');
        }
        const offset = (page - 1) * limit;
        return this.messageRepo.findConversationMessages(conversationId, limit, offset);
    }
    async sendMessage(data) {
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
    async editMessage(messageId, userId, content) {
        const message = await this.messageRepo.findById(messageId);
        if (!message) {
            throw new Error('Message not found');
        }
        if (message.senderId !== userId) {
            throw new Error('You can only edit your own messages');
        }
        return this.messageRepo.updateContent(messageId, content, userId);
    }
    async deleteMessage(messageId, userId) {
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
                }
                catch (error) {
                    console.error(`Failed to delete file from R2: ${attachment.r2ObjectKey}`, error);
                }
                await this.attachmentRepo.softDeleteAndMarkHardDeleted(attachment.id, userId);
            }
        }
        return this.messageRepo.softDelete(messageId, userId);
    }
    async addReaction(messageId, userId, emoji) {
        const message = await this.messageRepo.findById(messageId);
        if (!message) {
            throw new Error('Message not found');
        }
        const member = await this.memberRepo.findByConversationAndUser(message.conversationId, userId);
        if (!member) {
            throw new Error('You must be a member of the conversation to react');
        }
        return this.reactionRepo.createOrRestore(messageId, userId, emoji, userId);
    }
    async deleteReaction(_messageId, reactionId, userId) {
        const reaction = await this.reactionRepo.findById(reactionId);
        if (!reaction) {
            throw new Error('Reaction not found');
        }
        if (reaction.userId !== userId) {
            throw new Error('You can only delete your own reactions');
        }
        return this.reactionRepo.softDelete(reactionId, userId);
    }
    async markAsRead(messageId, userId) {
        const message = await this.messageRepo.findById(messageId);
        if (!message)
            return null;
        await this.memberRepo.updateLastReadAt(message.conversationId, userId);
        return this.messageRepo.updateStatus(messageId, 'READ');
    }
}
exports.MessageService = MessageService;
