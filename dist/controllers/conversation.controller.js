"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationController = void 0;
const conversation_service_1 = require("../services/conversation.service");
const message_service_1 = require("../services/message.service");
class ConversationController {
    conversationService;
    messageService;
    constructor(conversationService = new conversation_service_1.ConversationService(), messageService = new message_service_1.MessageService()) {
        this.conversationService = conversationService;
        this.messageService = messageService;
    }
    getMyConversations = async (req, res) => {
        try {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const conversations = await this.conversationService.getConversations(userId, page, limit);
            res.status(200).json({
                success: true,
                data: conversations,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch conversations',
            });
        }
    };
    createConversation = async (req, res) => {
        try {
            const userId = req.user.id;
            const { type, targetUserId, title, memberUserIds } = req.body;
            if (type === 'DIRECT') {
                if (!targetUserId) {
                    res.status(400).json({ success: false, error: 'targetUserId is required for DIRECT conversations' });
                    return;
                }
                const conversation = await this.conversationService.createOrGetDirectConversation(userId, targetUserId);
                res.status(200).json({ success: true, data: conversation });
                return;
            }
            else if (type === 'GROUP') {
                if (!title) {
                    res.status(400).json({ success: false, error: 'title is required for GROUP conversations' });
                    return;
                }
                const members = Array.isArray(memberUserIds) ? memberUserIds : [];
                const conversation = await this.conversationService.createGroupConversation(title, members, userId);
                res.status(201).json({ success: true, data: conversation });
                return;
            }
            else {
                res.status(400).json({ success: false, error: 'Invalid conversation type. Must be DIRECT or GROUP' });
                return;
            }
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message || 'Failed to create conversation',
            });
        }
    };
    getConversationMessages = async (req, res) => {
        try {
            const userId = req.user.id;
            const conversationId = req.params.conversationId;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const messages = await this.messageService.getConversationMessages(conversationId, userId, page, limit);
            res.status(200).json({
                success: true,
                data: messages,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message || 'Failed to fetch messages',
            });
        }
    };
}
exports.ConversationController = ConversationController;
