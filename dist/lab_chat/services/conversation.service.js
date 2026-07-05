"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationService = void 0;
const conversation_repository_1 = require("../repositories/conversation.repository");
const user_repository_1 = require("../../helpers/user.repository");
class ConversationService {
    conversationRepo;
    userRepo;
    constructor(conversationRepo = new conversation_repository_1.ConversationRepository(), userRepo = new user_repository_1.UserRepository()) {
        this.conversationRepo = conversationRepo;
        this.userRepo = userRepo;
    }
    async getConversations(userId, page, limit) {
        const offset = (page - 1) * limit;
        return this.conversationRepo.findUserConversations(userId, limit, offset);
    }
    async createOrGetDirectConversation(userId, targetUserId) {
        if (userId === targetUserId) {
            throw new Error('Cannot create a direct conversation with yourself');
        }
        const targetUser = await this.userRepo.findById(targetUserId);
        if (!targetUser) {
            throw new Error('Target user does not exist');
        }
        const existing = await this.conversationRepo.findDirectConversation(userId, targetUserId);
        if (existing) {
            return existing;
        }
        return this.conversationRepo.createDirect(userId, targetUserId, userId);
    }
    async createGroupConversation(title, memberUserIds, creatorId) {
        if (!title || title.trim() === '') {
            throw new Error('Group title is required');
        }
        const uniqueMembers = Array.from(new Set([...memberUserIds, creatorId]));
        if (uniqueMembers.length < 2) {
            throw new Error('A group conversation must have at least 2 members');
        }
        for (const memberId of uniqueMembers) {
            const userExists = await this.userRepo.findById(memberId);
            if (!userExists) {
                throw new Error(`User with ID ${memberId} does not exist`);
            }
        }
        return this.conversationRepo.createGroup(title, uniqueMembers, creatorId);
    }
    async getConversationDetails(conversationId, userId) {
        const conversation = await this.conversationRepo.findById(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }
        const isMember = conversation.members.some((m) => m.userId === userId);
        if (!isMember) {
            throw new Error('You are not a member of this conversation');
        }
        return conversation;
    }
    async softDeleteConversation(conversationId, actorId) {
        const conversation = await this.conversationRepo.findById(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }
        return this.conversationRepo.softDelete(conversationId, actorId);
    }
}
exports.ConversationService = ConversationService;
