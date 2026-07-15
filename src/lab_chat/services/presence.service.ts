import redisClient from '../../config/redis.config';
import { UserRepository } from '../../helpers/user.repository';

export class PresenceService {
  private activeSockets = new Map<string, Set<string>>();

  constructor(private userRepo = new UserRepository()) {}

  private getPresenceKey(userId: string): string {
    return `presence:${userId}`;
  }

  private getTypingKey(conversationId: string, userId: string): string {
    return `typing:${conversationId}:${userId}`;
  }

  async setUserOnline(userId: string, socketId: string): Promise<boolean> {
    if (!this.activeSockets.has(userId)) {
      this.activeSockets.set(userId, new Set());
    }
    const sockets = this.activeSockets.get(userId)!;
    const wasOffline = sockets.size === 0;

    sockets.add(socketId);

    if (wasOffline) {
      const key = this.getPresenceKey(userId);
      await redisClient.set(key, 'online', 'EX', 35);

      try {
        await this.userRepo.update(userId, {
          lastSeen: new Date(),
        });
      } catch (err) {
        console.error(`Failed to update user status in DB: ${userId}`, err);
      }
      return true;
    }

    return false;
  }

  async heartbeat(userId: string): Promise<void> {
    const key = this.getPresenceKey(userId);
    await redisClient.set(key, 'online', 'EX', 35);

    try {
      await this.userRepo.update(userId, {
        lastSeen: new Date(),
      });
    } catch (err) {
      console.error(`Failed to update user lastSeen: ${userId}`, err);
    }
  }

  async setUserOffline(userId: string, socketId: string): Promise<boolean> {
    const sockets = this.activeSockets.get(userId);
    if (!sockets) return false;

    sockets.delete(socketId);

    if (sockets.size === 0) {
      this.activeSockets.delete(userId);
      const key = this.getPresenceKey(userId);
      await redisClient.del(key);

      try {
        await this.userRepo.update(userId, {
          lastSeen: new Date(),
        });
      } catch (err) {
        console.error(`Failed to update user status in DB: ${userId}`, err);
      }
      return true;
    }

    return false;
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const key = this.getPresenceKey(userId);
    const exists = await redisClient.exists(key);
    return exists > 0;
  }

  async setUserTyping(conversationId: string, userId: string): Promise<boolean> {
    const key = this.getTypingKey(conversationId, userId);
    const exists = await redisClient.exists(key);
    await redisClient.set(key, 'typing', 'EX', 3);
    return exists === 0;
  }

  async setUserStoppedTyping(conversationId: string, userId: string): Promise<boolean> {
    const key = this.getTypingKey(conversationId, userId);
    const deleted = await redisClient.del(key);
    return deleted > 0;
  }
}
