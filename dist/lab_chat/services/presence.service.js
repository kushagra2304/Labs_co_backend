"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceService = void 0;
const redis_config_1 = __importDefault(require("../../config/redis.config"));
const user_repository_1 = require("../../helpers/user.repository");
class PresenceService {
    userRepo;
    activeSockets = new Map();
    constructor(userRepo = new user_repository_1.UserRepository()) {
        this.userRepo = userRepo;
    }
    getPresenceKey(userId) {
        return `presence:${userId}`;
    }
    getTypingKey(conversationId, userId) {
        return `typing:${conversationId}:${userId}`;
    }
    async setUserOnline(userId, socketId) {
        if (!this.activeSockets.has(userId)) {
            this.activeSockets.set(userId, new Set());
        }
        const sockets = this.activeSockets.get(userId);
        const wasOffline = sockets.size === 0;
        sockets.add(socketId);
        if (wasOffline) {
            const key = this.getPresenceKey(userId);
            await redis_config_1.default.set(key, 'online', 'EX', 35);
            try {
                await this.userRepo.update(userId, {
                    lastSeen: new Date(),
                });
            }
            catch (err) {
                console.error(`Failed to update user status in DB: ${userId}`, err);
            }
            return true;
        }
        return false;
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
    async setUserOffline(userId, socketId) {
        const sockets = this.activeSockets.get(userId);
        if (!sockets)
            return false;
        sockets.delete(socketId);
        if (sockets.size === 0) {
            this.activeSockets.delete(userId);
            const key = this.getPresenceKey(userId);
            await redis_config_1.default.del(key);
            try {
                await this.userRepo.update(userId, {
                    lastSeen: new Date(),
                });
            }
            catch (err) {
                console.error(`Failed to update user status in DB: ${userId}`, err);
            }
            return true;
        }
        return false;
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
