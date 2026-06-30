"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = void 0;
const auth_repository_1 = require("../repositories/auth.repository");
const hash_util_1 = require("../utils/hash.util");
const jwt_util_1 = require("../utils/jwt.util");
const registerUser = async (input) => {
    const existing = await (0, auth_repository_1.findUserByEmail)(input.email);
    if (existing) {
        throw { status: 409, message: "User already exists with this email" };
    }
    const passwordHash = await (0, hash_util_1.hashPassword)(input.password);
    const user = await (0, auth_repository_1.createUser)({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        department: input.department,
        designation: input.designation,
    });
    const token = (0, jwt_util_1.signToken)({ userId: user.id, role: user.role });
    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
    };
};
exports.registerUser = registerUser;
const loginUser = async (email, password) => {
    const user = await (0, auth_repository_1.findUserByEmail)(email);
    if (!user) {
        throw { status: 401, message: "Invalid email or password" };
    }
    const isMatch = await (0, hash_util_1.comparePassword)(password, user.passwordHash);
    if (!isMatch) {
        throw { status: 401, message: "Invalid email or password" };
    }
    if (!user.isActive) {
        throw { status: 403, message: "Account is deactivated" };
    }
    const token = (0, jwt_util_1.signToken)({ userId: user.id, role: user.role });
    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
    };
};
exports.loginUser = loginUser;
