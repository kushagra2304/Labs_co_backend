"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_repository_1 = require("../../helpers/user.repository");
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
            // Return user array directly containing only id, name, and email
            const formattedUsers = users.map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
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
