"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketAuthMiddleware = void 0;
const prisma_config_1 = __importDefault(require("../config/prisma.config"));
const require_auth_middleware_1 = require("./require-auth.middleware");
const socketAuthMiddleware = async (socket, next) => {
    try {
        const userId = socket.handshake.auth.userId ||
            socket.handshake.query.userId ||
            require_auth_middleware_1.MOCK_USER_ID;
        let user = await prisma_config_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            if (userId === require_auth_middleware_1.MOCK_USER_ID) {
                user = await prisma_config_1.default.user.create({
                    data: {
                        id: require_auth_middleware_1.MOCK_USER_ID,
                        name: 'Mock User',
                        email: 'mockuser@example.com',
                        role: 'employee',
                        isActive: true,
                        lastSeen: new Date(),
                    },
                });
            }
            else {
                next(new Error('Authentication error: User not found'));
                return;
            }
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
