"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceRepository = void 0;
const client_1 = __importDefault(require("../../prisma/client"));
class AttendanceRepository {
    // -------------------------------------------------------------
    // Attendance Policy
    // -------------------------------------------------------------
    async getPolicy() {
        let policy = await client_1.default.attendancePolicy.findFirst({
            where: { deletedAt: null },
        });
        if (!policy) {
            policy = await client_1.default.attendancePolicy.create({
                data: {
                    officeStartTime: '09:00',
                    officeEndTime: '18:00',
                    gracePeriod: 15,
                    lateMinutes: 30,
                    minimumWorkingHours: 8.0,
                    maximumWorkingHours: 12.0,
                    autoCheckout: true,
                    // No automatic weekends/Sundays off — every day is a working day
                    // by default. Time off only happens via the monthly leave quota.
                    workingDays: '1,2,3,4,5,6,7',
                    monthlyLeaveQuota: 4,
                },
            });
        }
        return policy;
    }
    async updatePolicy(id, data) {
        return client_1.default.attendancePolicy.update({
            where: { id },
            data,
        });
    }
    // -------------------------------------------------------------
    // Office WiFi
    // -------------------------------------------------------------
    async getWifiList(includeDeleted = false) {
        return client_1.default.officeWifi.findMany({
            where: includeDeleted ? {} : { deletedAt: null },
            orderBy: { officeName: 'asc' },
        });
    }
    async findWifiById(id) {
        return client_1.default.officeWifi.findFirst({
            where: { id, deletedAt: null },
        });
    }
    async findWifiByBssid(bssid) {
        return client_1.default.officeWifi.findFirst({
            where: { bssid, deletedAt: null },
        });
    }
    async createWifi(data) {
        return client_1.default.officeWifi.create({ data });
    }
    async updateWifi(id, data) {
        return client_1.default.officeWifi.update({
            where: { id },
            data,
        });
    }
    async softDeleteWifi(id, actorId) {
        return client_1.default.officeWifi.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                deletedBy: actorId,
                isDeleted: true,
            },
        });
    }
    async restoreWifi(id) {
        return client_1.default.officeWifi.update({
            where: { id },
            data: {
                deletedAt: null,
                deletedBy: null,
                isDeleted: false,
            },
        });
    }
    // -------------------------------------------------------------
    // Holidays
    // -------------------------------------------------------------
    async getHolidays(includeDeleted = false) {
        return client_1.default.holiday.findMany({
            where: includeDeleted ? {} : { deletedAt: null },
            orderBy: { date: 'asc' },
        });
    }
    async findHolidayById(id) {
        return client_1.default.holiday.findFirst({
            where: { id, deletedAt: null },
        });
    }
    async createHoliday(data) {
        return client_1.default.holiday.create({ data });
    }
    async softDeleteHoliday(id, actorId) {
        return client_1.default.holiday.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                deletedBy: actorId,
                isDeleted: true,
            },
        });
    }
    // -------------------------------------------------------------
    // Attendance Requests (Manual Requests)
    // -------------------------------------------------------------
    async createRequest(data) {
        return client_1.default.attendanceRequest.create({ data });
    }
    async findRequestById(id) {
        return client_1.default.attendanceRequest.findFirst({
            where: { id, deletedAt: null },
            include: { user: true },
        });
    }
    async getRequests(filters) {
        const whereClause = { deletedAt: null };
        if (filters.userId) {
            whereClause.userId = filters.userId;
        }
        if (filters.status) {
            whereClause.status = filters.status;
        }
        return client_1.default.attendanceRequest.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: true,
                    },
                },
            },
            orderBy: { date: 'desc' },
        });
    }
    async updateRequest(id, data) {
        return client_1.default.attendanceRequest.update({
            where: { id },
            data,
        });
    }
    // -------------------------------------------------------------
    // Attendance Records
    // -------------------------------------------------------------
    async findTodayAttendance(userId, dateStr) {
        // Use a date range spanning the full calendar day to avoid timezone mismatches
        // when querying a @db.Date column which stores UTC midnight.
        const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
        const endOfDay = new Date(dateStr + 'T23:59:59.999Z');
        return client_1.default.attendance.findFirst({
            where: {
                userId,
                date: { gte: startOfDay, lte: endOfDay },
                deletedAt: null,
            },
        });
    }
    async createAttendance(data) {
        return client_1.default.attendance.create({ data });
    }
    // Count how many *paid* leave days a user already has recorded within a
    // given month — used to enforce the monthly leave quota when approving a
    // new leave request.
    async countPaidLeavesInMonth(userId, startOfMonth, endOfMonth) {
        return client_1.default.attendance.count({
            where: {
                userId,
                status: 'Leave',
                isPaidLeave: true,
                date: { gte: startOfMonth, lte: endOfMonth },
                deletedAt: null,
            },
        });
    }
    async updateAttendance(id, data) {
        return client_1.default.attendance.update({
            where: { id },
            data,
        });
    }
    async getAttendanceHistory(filters) {
        const whereClause = { deletedAt: null };
        if (filters.userId) {
            whereClause.userId = filters.userId;
        }
        if (filters.status) {
            whereClause.status = filters.status;
        }
        if (filters.startDate || filters.endDate) {
            whereClause.date = {};
            if (filters.startDate) {
                whereClause.date.gte = filters.startDate;
            }
            if (filters.endDate) {
                whereClause.date.lte = filters.endDate;
            }
        }
        return client_1.default.attendance.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: true,
                        designation: true,
                    },
                },
            },
            orderBy: { date: 'desc' },
        });
    }
    async createHistoryLog(data) {
        return client_1.default.attendanceHistory.create({ data });
    }
    // -------------------------------------------------------------
    // Notifications
    // -------------------------------------------------------------
    async createNotification(data) {
        return client_1.default.attendanceNotification.create({ data });
    }
    async getNotifications(userId) {
        return client_1.default.attendanceNotification.findMany({
            where: { userId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }
    async markNotificationRead(id) {
        return client_1.default.attendanceNotification.update({
            where: { id },
            data: { isRead: true },
        });
    }
    // -------------------------------------------------------------
    // Audit Logs
    // -------------------------------------------------------------
    async createAuditLog(data) {
        return client_1.default.auditLog.create({ data });
    }
    async getAuditLogs() {
        return client_1.default.auditLog.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
exports.AttendanceRepository = AttendanceRepository;
