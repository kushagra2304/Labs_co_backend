import redisClient from '../../config/redis.config';
import { UserRepository } from '../../helpers/user.repository';

export class PresenceService {
  constructor(private userRepo = new UserRepository()) {}

  private getPresenceKey(userId: string): string {
    return `presence:${userId}`;
  }

  private getTypingKey(conversationId: string, userId: string): string {
    return `typing:${conversationId}:${userId}`;
  }

  async setUserOnline(userId: string): Promise<boolean> {
    const key = this.getPresenceKey(userId);
    const exists = await redisClient.exists(key);
    await redisClient.set(key, 'online', 'EX', 35);

    try {
      await this.userRepo.update(userId, {
        lastSeen: new Date(),
      });
    } catch (err) {
      console.error(`Failed to update user status in DB: ${userId}`, err);
    }

    return exists === 0;
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

  async setUserOffline(userId: string): Promise<boolean> {
    const key = this.getPresenceKey(userId);
    const deleted = await redisClient.del(key);

    try {
      await this.userRepo.update(userId, {
        lastSeen: new Date(),
      });
    } catch (err) {
      console.error(`Failed to update user status in DB: ${userId}`, err);
    }

    return deleted > 0;
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
