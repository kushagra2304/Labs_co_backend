"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceService = void 0;
const redis_config_1 = __importDefault(require("../config/redis.config"));
const user_repository_1 = require("../repositories/user.repository");
class PresenceService {
    userRepo;
    constructor(userRepo = new user_repository_1.UserRepository()) {
        this.userRepo = userRepo;
    }
    getPresenceKey(userId) {
        return `presence:${userId}`;
    }
    getTypingKey(conversationId, userId) {
        return `typing:${conversationId}:${userId}`;
    }
    async setUserOnline(userId) {
        const key = this.getPresenceKey(userId);
        const exists = await redis_config_1.default.exists(key);
        await redis_config_1.default.set(key, 'online', 'EX', 35);
        try {
            await this.userRepo.update(userId, {
                isActive: true,
                lastSeen: new Date(),
            });
        }
        catch (err) {
            console.error(`Failed to update user status in DB: ${userId}`, err);
        }
        return exists === 0;
    }
    async heartbeat(userId) {
        const key = this.getPresenceKey(userId);
        await redis_config_1.default.set(key, 'online', 'EX', 35);
        try {
            await this.userRepo.update(userId, {
                lastSeen: new Date(),
            });
        }
        catch (err) {
            console.error(`Failed to update user lastSeen: ${userId}`, err);
        }
    }
    async setUserOffline(userId) {
        const key = this.getPresenceKey(userId);
        const deleted = await redis_config_1.default.del(key);
        try {
            await this.userRepo.update(userId, {
                isActive: false,
                lastSeen: new Date(),
            });
        }
        catch (err) {
            console.error(`Failed to update user status in DB: ${userId}`, err);
        }
        return deleted > 0;
    }
    async isUserOnline(userId) {
        const key = this.getPresenceKey(userId);
        const exists = await redis_config_1.default.exists(key);
        return exists > 0;
    }
    async setUserTyping(conversationId, userId) {
        const key = this.getTypingKey(conversationId, userId);
        const exists = await redis_config_1.default.exists(key);
        await redis_config_1.default.set(key, 'typing', 'EX', 3);
        return exists === 0;
    }
    async setUserStoppedTyping(conversationId, userId) {
        const key = this.getTypingKey(conversationId, userId);
        const deleted = await redis_config_1.default.del(key);
        return deleted > 0;
    }
}
exports.PresenceService = PresenceService;
