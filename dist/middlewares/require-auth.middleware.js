"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireAuth = exports.MOCK_USER_ID = void 0;
const prisma_config_1 = __importDefault(require("../config/prisma.config"));
exports.MOCK_USER_ID = '11111111-1111-1111-1111-111111111111';
const requireAuth = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'] || exports.MOCK_USER_ID;
        let user = await prisma_config_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            if (userId === exports.MOCK_USER_ID) {
                user = await prisma_config_1.default.user.create({
                    data: {
                        id: exports.MOCK_USER_ID,
                        name: 'Mock User',
                        email: 'mockuser@example.com',
                        role: 'employee',
                        isActive: true,
                        lastSeen: new Date(),
                    },
                });
            }
            else {
                res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
                return;
            }
        }
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        };
        next();
    }
    catch (error) {
        console.error('requireAuth middleware error:', error);
        res.status(500).json({ success: false, error: 'Authentication failed' });
    }
};
exports.requireAuth = requireAuth;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
