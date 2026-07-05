"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = verifyToken;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = __importDefault(require("../prisma/client"));
// No local AuthedRequest interface — req.user is already typed globally
// by lab_auth's Express.Request augmentation ({ id, name, email, role }).
// Redeclaring it here with a narrower role type is what caused the
// "incorrectly extends" error.
async function verifyToken(req, res, next) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token)
        return res.status(401).json({ message: "No token provided" });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id ?? decoded.userId;
        if (!userId)
            return res.status(401).json({ message: "Invalid token payload" });
        const user = await client_1.default.user.findFirst({
            where: { id: userId, deletedAt: null },
            select: { id: true, name: true, email: true, role: true },
        });
        if (!user)
            return res.status(401).json({ message: "User not found" });
        // Matches the global Request.user shape exactly — no cast needed.
        req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
        next();
    }
    catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    };
}
