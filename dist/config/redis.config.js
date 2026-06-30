"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = exports.createRedisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const createRedisClient = () => {
    const client = new ioredis_1.default(redisUrl, {
        maxRetriesPerRequest: null,
    });
    client.on('error', (err) => {
        console.error('Redis connection error:', err);
    });
    return client;
};
exports.createRedisClient = createRedisClient;
exports.redisClient = (0, exports.createRedisClient)();
exports.default = exports.redisClient;
