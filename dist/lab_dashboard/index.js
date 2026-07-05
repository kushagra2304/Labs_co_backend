"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// import userRoutes from './routes/user';
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const projects_routes_1 = __importDefault(require("./routes/projects.routes"));
const calender_routes_1 = __importDefault(require("./routes/calender.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const router = (0, express_1.Router)();
// router.use('/users', userRoutes);
router.use('/dashboard', dashboard_routes_1.default);
router.use('/projects', projects_routes_1.default);
router.use('/calendar', calender_routes_1.default);
router.use('/notifications', notification_routes_1.default);
exports.default = router;
