"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const lab_auth_1 = require("./lab_auth");
const lab_chat_1 = require("./lab_chat");
const lab_dashboard_1 = require("./lab_dashboard");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: '*',
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Auth module routes
app.use('/api/v1/auth', lab_auth_1.authRoutes);
// Chat module routes
app.use('/api/v1/chat', lab_chat_1.chatRoutes);
app.use('/api/chat', lab_chat_1.chatRoutes);
// Dashboard module routes — /employees preserved under /api/v1/chat for backward compatibility
app.use('/api/v1/chat', lab_dashboard_1.dashboardRoutes);
app.use('/api/chat', lab_dashboard_1.dashboardRoutes);
app.use((err, _req, res, _next) => {
    console.error('Unhandled Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal Server Error',
    });
});
exports.default = app;
