"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageController = void 0;
const message_service_1 = require("../services/message.service");
const client_1 = __importDefault(require("../../prisma/client"));
class MessageController {
    messageService;
    constructor(messageService = new message_service_1.MessageService()) {
        this.messageService = messageService;
    }
    editMessage = async (req, res) => {
        try {
            const userId = req.user.id;
            const messageId = req.params.messageId;
            const { content } = req.body;
            if (!content || content.trim() === '') {
                res.status(400).json({ success: false, error: 'Content is required to edit message' });
                return;
            }
            const message = await this.messageService.editMessage(messageId, userId, content);
            res.status(200).json({
                success: true,
                data: message,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message || 'Failed to edit message',
            });
        }
    };
    deleteMessage = async (req, res) => {
        try {
            const userId = req.user.id;
            const messageId = req.params.messageId;
            const message = await this.messageService.deleteMessage(messageId, userId);
            res.status(200).json({
                success: true,
                data: message,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message || 'Failed to delete message',
            });
        }
    };
    addReaction = async (req, res) => {
        try {
            const userId = req.user.id;
            const messageId = req.params.messageId;
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
                const members = await client_1.default.conversationMember.findMany({
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
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message || 'Failed to add reaction',
            });
        }
    };
    deleteReaction = async (req, res) => {
        try {
            const userId = req.user.id;
            const messageId = req.params.messageId;
            const reactionId = req.params.reactionId;
            const { reaction, conversationId } = await this.messageService.deleteReaction(messageId, reactionId, userId);
            const io = req.app.get('io');
            if (io) {
                io.to(conversationId).emit('reaction_removed', {
                    messageId,
                    reactionId,
                    conversationId,
                });
                // Query members to emit to their personal rooms
                const members = await client_1.default.conversationMember.findMany({
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
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message || 'Failed to delete reaction',
            });
        }
    };
}
exports.MessageController = MessageController;
