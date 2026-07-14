"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_repository_1 = require("../../helpers/user.repository");
class UserController {
    userRepo;
    constructor(userRepo = new user_repository_1.UserRepository()) {
        this.userRepo = userRepo;
    }
    getEmployees = async (_req, res) => {
        try {
            const users = await this.userRepo.findAll();
            res.status(200).json({
                success: true,
                data: users,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch employees',
            });
        }
    };
    getActiveEmployees = async (_req, res) => {
        try {
            const users = await this.userRepo.findActiveEmployees();
            res.status(200).json({
                success: true,
                data: users,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch active employees',
            });
        }
    };
}
exports.UserController = UserController;
