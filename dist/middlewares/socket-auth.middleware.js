"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketAuthMiddleware = void 0;
const prisma_config_1 = __importDefault(require("../config/prisma.config"));
const jwt_util_1 = require("../utils/jwt.util");
const socketAuthMiddleware = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token ||
            socket.handshake.query.token;
        if (!token) {
            next(new Error('Authentication error: No token provided'));
            return;
        }
        let decoded;
        try {
            decoded = (0, jwt_util_1.verifyToken)(token);
        }
        catch (err) {
            next(new Error('Authentication error: Invalid or expired token'));
            return;
        }
        const user = await prisma_config_1.default.user.findUnique({
            where: { id: decoded.userId },
        });
        if (!user) {
            next(new Error('Authentication error: User not found'));
            return;
        }
        if (!user.isActive) {
            next(new Error('Authentication error: Account is deactivated'));
            return;
        }
        socket.data.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        };
        next();
    }
    catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
    }
};
exports.socketAuthMiddleware = socketAuthMiddleware;
