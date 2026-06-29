import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const createRedisClient = () => {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  client.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  return client;
};

export const redisClient = createRedisClient();

export default redisClient;
