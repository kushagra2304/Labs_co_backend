"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const auth_service_1 = require("../services/auth.service");
const register = async (req, res) => {
    try {
        const { name, email, password, role, department, designation } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const result = await (0, auth_service_1.registerUser)({ name, email, password, role, department, designation });
        return res.status(201).json(result);
    }
    catch (err) {
        return res.status(err.status || 500).json({ message: err.message || "Server error" });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const result = await (0, auth_service_1.loginUser)(email, password);
        return res.status(200).json(result);
    }
    catch (err) {
        return res.status(err.status || 500).json({ message: err.message || "Server error" });
    }
};
exports.login = login;
