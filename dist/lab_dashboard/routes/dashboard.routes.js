"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const require_auth_middleware_1 = require("../../lab_auth/middleware/require-auth.middleware");
const user_controller_1 = require("../controllers/user.controller");
const router = (0, express_1.Router)();
const userController = new user_controller_1.UserController();
// Secure all routes with auth
router.use(require_auth_middleware_1.requireAuth);
// Employee list (previously at /api/v1/chat/employees — preserved via chat routes alias in app.ts)
router.get('/employees', userController.getEmployees);
exports.default = router;
