"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const attendance_service_1 = require("../services/attendance.service");
class AttendanceController {
    service;
    constructor(service = new attendance_service_1.AttendanceService()) {
        this.service = service;
    }
    // Policy
    getPolicy = async (_req, res) => {
        try {
            const policy = await this.service.getPolicy();
            res.status(200).json({ success: true, data: policy });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
    updatePolicy = async (req, res) => {
        try {
            const actorId = req.user.id;
            const policy = await this.service.updatePolicy(req.body.id, req.body, actorId);
            res.status(200).json({ success: true, data: policy });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
    // WiFi
    getWifiList = async (req, res) => {
        try {
            const includeDeleted = req.user.role === 'admin';
            const wifis = await this.service.getWifiList(includeDeleted);
            res.status(200).json({ success: true, data: wifis });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
    addWifi = async (req, res) => {
        try {
            const actorId = req.user.id;
            const wifi = await this.service.addWifi(req.body, actorId);
            res.status(201).json({ success: true, data: wifi });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };
    updateWifi = async (req, res) => {
        try {
            const actorId = req.user.id;
            const wifi = await this.service.updateWifi(req.params.id, req.body, actorId);
            res.status(200).json({ success: true, data: wifi });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };
    deleteWifi = async (req, res) => {
        try {
            const actorId = req.user.id;
            const wifi = await this.service.deleteWifi(req.params.id, actorId);
            res.status(200).json({ success: true, data: wifi });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
    restoreWifi = async (req, res) => {
        try {
            const actorId = req.user.id;
            const wifi = await this.service.restoreWifi(req.params.id, actorId);
            res.status(200).json({ success: true, data: wifi });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
    // Holidays
    getHolidays = async (req, res) => {
        try {
            const includeDeleted = req.user.role === 'admin';
            const holidays = await this.service.getHolidays(includeDeleted);
            res.status(200).json({ success: true, data: holidays });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
    addHoliday = async (req, res) => {
        try {
            const actorId = req.user.id;
            const holiday = await this.service.addHoliday(req.body, actorId);
            res.status(201).json({ success: true, data: holiday });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };
    deleteHoliday = async (req, res) => {
        try {
            const actorId = req.user.id;
            const holiday = await this.service.deleteHoliday(req.params.id, actorId);
            res.status(200).json({ success: true, data: holiday });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
    // Check In/Out
    checkIn = async (req, res) => {
        try {
            const userId = req.user.id;
            const record = await this.service.checkIn(userId, req.body);
            res.status(200).json({ success: true, data: record });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };
    checkOut = async (req, res) => {
        try {
            const userId = req.user.id;
            const record = await this.service.checkOut(userId, req.body);
            res.status(200).json({ success: true, data: record });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };
    getTodayStatus = async (req, res) => {
        try {
            const userId = req.user.id;
            const dateStr = req.query.date || new Date().toISOString().split('T')[0];
            const repo = this.service['repo']; // access the repo
            const attendance = await repo.findTodayAttendance(userId, dateStr);
            res.status(200).json({ success: true, data: attendance });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
    // Manual Requests
    submitRequest = async (req, res) => {
        try {
            const userId = req.user.id;
            const request = await this.service.submitRequest(userId, req.body);
            res.status(201).json({ success: true, data: request });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };
    getRequests = async (req, res) => {
        try {
            const actorId = req.user.id;
            const role = req.user.role;
            const filters = {
                userId: req.query.userId,
                status: req.query.status,
            };
            const requests = await this.service.getRequests(actorId, role, filters);
            res.status(200).json({ success: true, data: requests });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
    processRequest = async (req, res) => {
        try {
            const adminId = req.user.id;
            const { status, adminRemarks } = req.body;
            if (!['approved', 'rejected'].includes(status)) {
                throw new Error('Status must be approved or rejected.');
            }
            const request = await this.service.processRequest(req.params.id, status, adminRemarks, adminId);
            res.status(200).json({ success: true, data: request });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };
    // Stats and History
    getHistory = async (req, res) => {
        try {
            const actorId = req.user.id;
            const role = req.user.role;
            let targetUserId = actorId;
            if (role === 'admin' && req.query.userId) {
                targetUserId = req.query.userId;
            }
            const filters = { userId: targetUserId };
            if (req.query.startDate) {
                filters.startDate = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                filters.endDate = new Date(req.query.endDate);
            }
            if (req.query.status) {
                filters.status = req.query.status;
            }
            const history = await this.service.getAttendanceHistory(filters);
            res.status(200).json({ success: true, data: history });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
    getStats = async (req, res) => {
        try {
            const actorId = req.user.id;
            const role = req.user.role;
            let targetUserId = actorId;
            if (role === 'admin' && req.query.userId) {
                targetUserId = req.query.userId;
            }
            const stats = await this.service.getDashboardStats(targetUserId);
            res.status(200).json({ success: true, data: stats });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
    getReports = async (req, res) => {
        try {
            const actorId = req.user.id;
            const role = req.user.role;
            const filters = {};
            if (role !== 'admin') {
                filters.userId = actorId;
            }
            else {
                if (req.query.userId)
                    filters.userId = req.query.userId;
                if (req.query.department)
                    filters.department = req.query.department;
            }
            if (req.query.startDate) {
                filters.startDate = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                filters.endDate = new Date(req.query.endDate);
            }
            const data = await this.service.generateReportData(filters);
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
    // Notifications
    getNotifications = async (req, res) => {
        try {
            const userId = req.user.id;
            const list = await this.service.getNotifications(userId);
            res.status(200).json({ success: true, data: list });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
    markNotificationRead = async (req, res) => {
        try {
            const item = await this.service.markNotificationRead(req.params.id);
            res.status(200).json({ success: true, data: item });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
    // Audit Logs
    getAuditLogs = async (_req, res) => {
        try {
            const logs = await this.service.getAuditLogs();
            res.status(200).json({ success: true, data: logs });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };
}
exports.AttendanceController = AttendanceController;
