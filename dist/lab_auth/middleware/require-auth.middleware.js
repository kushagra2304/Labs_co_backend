"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireAuth = void 0;
const client_1 = __importDefault(require("../../prisma/client"));
const jwt_util_1 = require("../../utils/jwt.util");
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
            return;
        }
        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = (0, jwt_util_1.verifyToken)(token);
        }
        catch (err) {
            res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
            return;
        }
        const user = await client_1.default.user.findUnique({
            where: { id: decoded.userId },
        });
        if (!user) {
            res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
            return;
        }
        if (!user.isActive) {
            res.status(403).json({ success: false, error: 'Forbidden: Account is deactivated' });
            return;
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
