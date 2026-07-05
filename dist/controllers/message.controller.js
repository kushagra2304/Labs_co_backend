"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageController = void 0;
const message_service_1 = require("../services/message.service");
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
            const reaction = await this.messageService.addReaction(messageId, userId, emoji);
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
            const reaction = await this.messageService.deleteReaction(messageId, reactionId, userId);
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
