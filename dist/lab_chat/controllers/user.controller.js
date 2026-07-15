"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_repository_1 = require("../../helpers/user.repository");
const presence_service_1 = require("../services/presence.service");
class UserController {
    userRepo;
    constructor(userRepo = new user_repository_1.UserRepository()) {
        this.userRepo = userRepo;
    }
    getChatUsers = async (req, res) => {
        try {
            const currentUserId = req.user?.id;
            if (!currentUserId) {
                res.status(401).json({ success: false, error: 'Unauthorized: Missing user context' });
                return;
            }
            const users = await this.userRepo.findActiveEmployeesExcept(currentUserId);
            const presenceService = new presence_service_1.PresenceService();
            const formattedUsers = await Promise.all(users.map(async (user) => {
                const isOnline = await presenceService.isUserOnline(user.id);
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    avatarUrl: user.avatarUrl || null,
                    role: user.role,
                    isActive: user.isActive,
                    lastSeen: user.lastSeen,
                    isOnline,
                };
            }));
            res.status(200).json(formattedUsers);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch chat users',
            });
        }
    };
}
exports.UserController = UserController;
