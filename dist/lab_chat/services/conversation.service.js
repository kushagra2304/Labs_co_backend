"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationService = void 0;
const conversation_repository_1 = require("../repositories/conversation.repository");
const user_repository_1 = require("../../helpers/user.repository");
const conversation_member_repository_1 = require("../repositories/conversation-member.repository");
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
    async addConversationMember(conversationId, userId, actorId) {
        const conversation = await this.conversationRepo.findById(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }
        if (conversation.type !== 'GROUP') {
            throw new Error('Cannot add members to a direct conversation');
        }
        const isActorMember = conversation.members.some((m) => m.userId === actorId);
        if (!isActorMember) {
            throw new Error('You must be a member of this conversation to add members');
        }
        const memberRepo = new conversation_member_repository_1.ConversationMemberRepository();
        await memberRepo.addMember(conversationId, userId, actorId);
        return this.conversationRepo.findById(conversationId);
    }
    async removeConversationMember(conversationId, userId, actorId) {
        const conversation = await this.conversationRepo.findById(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }
        if (conversation.type !== 'GROUP') {
            throw new Error('Cannot remove members from a direct conversation');
        }
        const isCreator = conversation.createdBy === actorId;
        const isSelf = userId === actorId;
        if (!isCreator && !isSelf) {
            throw new Error('Only the group creator can remove other members');
        }
        const memberRepo = new conversation_member_repository_1.ConversationMemberRepository();
        await memberRepo.removeMember(conversationId, userId, actorId);
        return this.conversationRepo.findById(conversationId);
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
