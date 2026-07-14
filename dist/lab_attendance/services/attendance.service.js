"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const attendance_repository_1 = require("../repositories/attendance.repository");
const client_1 = __importDefault(require("../../prisma/client"));
const client_2 = require("@prisma/client");
class AttendanceService {
    repo;
    constructor(repo = new attendance_repository_1.AttendanceRepository()) {
        this.repo = repo;
    }
    // -------------------------------------------------------------
    // Policies
    // -------------------------------------------------------------
    async getPolicy() {
        return this.repo.getPolicy();
    }
    async updatePolicy(id, data, actorId) {
        const safeData = {};
        const allowed = [
            'officeStartTime', 'officeEndTime', 'gracePeriod', 'lateMinutes',
            'halfDayRules', 'minimumWorkingHours', 'maximumWorkingHours',
            'overtimeRules', 'autoCheckout', 'workingDays',
        ];
        for (const key of allowed) {
            if (key in data)
                safeData[key] = data[key];
        }
        const updated = await this.repo.updatePolicy(id, safeData);
        await this.repo.createAuditLog({
            user: actorId ? { connect: { id: actorId } } : undefined,
            action: 'UPDATE_POLICY',
            details: `Updated policy: ${JSON.stringify(safeData)}`,
        });
        return updated;
    }
    // -------------------------------------------------------------
    // Office WiFi
    // -------------------------------------------------------------
    async getWifiList(includeDeleted = false) {
        return this.repo.getWifiList(includeDeleted);
    }
    async addWifi(data, actorId) {
        // Validation
        if (!data.officeName || !data.ssid || !data.bssid) {
            throw new Error('Office Name, SSID, and BSSID are required.');
        }
        // Validate MAC Address format (BSSID)
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        if (!macRegex.test(data.bssid)) {
            throw new Error('Invalid MAC Address format. Use XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX.');
        }
        // Check duplicate BSSID
        const existing = await this.repo.findWifiByBssid(data.bssid);
        if (existing) {
            throw new Error('A WiFi network with this BSSID already exists.');
        }
        const wifi = await this.repo.createWifi({
            officeName: data.officeName,
            ssid: data.ssid,
            bssid: data.bssid,
            staticIp: data.staticIp || null,
            floor: data.floor || null,
            description: data.description || null,
            isActive: data.isActive !== undefined ? data.isActive : true,
            createdBy: actorId,
        });
        await this.repo.createAuditLog({
            user: actorId ? { connect: { id: actorId } } : undefined,
            action: 'ADD_WIFI',
            details: `Added wifi network: ${wifi.ssid} (${wifi.bssid}) for office ${wifi.officeName}`,
        });
        return wifi;
    }
    async updateWifi(id, data, actorId) {
        const existing = await this.repo.findWifiById(id);
        if (!existing) {
            throw new Error('WiFi configuration not found.');
        }
        if (data.bssid && data.bssid !== existing.bssid) {
            const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
            if (!macRegex.test(data.bssid)) {
                throw new Error('Invalid MAC Address format.');
            }
            const duplicate = await this.repo.findWifiByBssid(data.bssid);
            if (duplicate) {
                throw new Error('A WiFi network with this BSSID already exists.');
            }
        }
        const updated = await this.repo.updateWifi(id, {
            officeName: data.officeName,
            ssid: data.ssid,
            bssid: data.bssid,
            staticIp: data.staticIp,
            floor: data.floor,
            description: data.description,
            isActive: data.isActive,
            updatedBy: actorId,
        });
        await this.repo.createAuditLog({
            user: actorId ? { connect: { id: actorId } } : undefined,
            action: 'UPDATE_WIFI',
            details: `Updated wifi config ID: ${id}`,
        });
        return updated;
    }
    async deleteWifi(id, actorId) {
        const wifi = await this.repo.softDeleteWifi(id, actorId);
        await this.repo.createAuditLog({
            user: actorId ? { connect: { id: actorId } } : undefined,
            action: 'DELETE_WIFI',
            details: `Soft deleted WiFi: ${wifi.ssid} (${wifi.bssid})`,
        });
        return wifi;
    }
    async restoreWifi(id, actorId) {
        const wifi = await this.repo.restoreWifi(id);
        await this.repo.createAuditLog({
            user: actorId ? { connect: { id: actorId } } : undefined,
            action: 'RESTORE_WIFI',
            details: `Restored WiFi: ${wifi.ssid} (${wifi.bssid})`,
        });
        return wifi;
    }
    // -------------------------------------------------------------
    // Holidays
    // -------------------------------------------------------------
    async getHolidays(includeDeleted = false) {
        return this.repo.getHolidays(includeDeleted);
    }
    async addHoliday(data, actorId) {
        if (!data.name || !data.date) {
            throw new Error('Holiday name and date are required.');
        }
        const holidayDate = new Date(data.date);
        const holiday = await this.repo.createHoliday({
            name: data.name,
            date: holidayDate,
            isRecurring: data.isRecurring || false,
            description: data.description || null,
            createdBy: actorId,
        });
        await this.repo.createAuditLog({
            user: actorId ? { connect: { id: actorId } } : undefined,
            action: 'ADD_HOLIDAY',
            details: `Added holiday: ${holiday.name} on ${holidayDate.toISOString().split('T')[0]}`,
        });
        return holiday;
    }
    async deleteHoliday(id, actorId) {
        const holiday = await this.repo.softDeleteHoliday(id, actorId);
        await this.repo.createAuditLog({
            user: actorId ? { connect: { id: actorId } } : undefined,
            action: 'DELETE_HOLIDAY',
            details: `Soft deleted holiday: ${holiday.name}`,
        });
        return holiday;
    }
    // -------------------------------------------------------------
    // Check-In
    // -------------------------------------------------------------
    async checkIn(userId, data) {
        const dateStr = data.date;
        const now = data.time ? new Date(data.time) : new Date();
        // Check duplicate
        const existing = await this.repo.findTodayAttendance(userId, dateStr);
        if (existing) {
            throw new Error('Attendance for today has already been marked.');
        }
        let connectedWifi = null;
        let matchedOffice = 'Office Location';
        if (data.source === 'WiFi') {
            if (!data.wifiSSID || !data.wifiBSSID) {
                throw new Error('SSID and BSSID are required for WiFi check-in.');
            }
            // Verify WiFi BSSID (MAC Address)
            const wifis = await this.repo.getWifiList(false);
            const match = wifis.find((w) => w.bssid.toLowerCase() === data.wifiBSSID?.toLowerCase() && w.isActive);
            if (!match) {
                throw new Error('You are not connected to an approved office WiFi network.');
            }
            connectedWifi = match.ssid;
            matchedOffice = match.officeName;
        }
        // Determine status (Present vs Late)
        const policy = await this.repo.getPolicy();
        let status = 'Present';
        // Parse office start time (e.g. "09:00")
        const [startHour, startMin] = policy.officeStartTime.split(':').map(Number);
        const graceMinutes = policy.gracePeriod;
        // Construct threshold datetime
        const thresholdTime = new Date(now);
        thresholdTime.setHours(startHour, startMin, 0, 0);
        thresholdTime.setMinutes(thresholdTime.getMinutes() + graceMinutes);
        // If current time is past threshold, check-in is Late
        if (now.getTime() > thresholdTime.getTime()) {
            status = 'Late';
        }
        const attendance = await this.repo.createAttendance({
            user: { connect: { id: userId } },
            date: new Date(dateStr),
            status,
            checkIn: now,
            source: data.source,
            wifiUsed: connectedWifi,
            officeName: matchedOffice,
            deviceInfo: data.deviceInfo || null,
            ipAddress: data.ipAddress || null,
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            notes: data.notes || null,
            createdBy: userId,
        });
        // Create Audit Log
        await this.repo.createAuditLog({
            user: userId ? { connect: { id: userId } } : undefined,
            action: 'CHECK_IN',
            details: `Checked in at ${now.toISOString()} using ${data.source}. Status: ${status}`,
            ipAddress: data.ipAddress,
            userAgent: data.deviceInfo,
        });
        // Send notification
        await this.repo.createNotification({
            user: { connect: { id: userId } },
            title: 'Attendance Marked Successfully',
            message: `Your check-in has been logged at ${now.toLocaleTimeString()} as ${status}.`,
            type: 'attendance_marked',
        });
        if (status === 'Late') {
            await this.repo.createNotification({
                user: { connect: { id: userId } },
                title: 'Late Arrival Detected',
                message: `You checked in after the grace period at ${now.toLocaleTimeString()}.`,
                type: 'late_arrival',
            });
        }
        return attendance;
    }
    // -------------------------------------------------------------
    // Check-Out
    // -------------------------------------------------------------
    async checkOut(userId, data) {
        const dateStr = data.date;
        const now = data.time ? new Date(data.time) : new Date();
        const attendance = await this.repo.findTodayAttendance(userId, dateStr);
        if (!attendance || !attendance.checkIn) {
            throw new Error('No check-in record found for today.');
        }
        if (attendance.checkOut) {
            throw new Error('You have already checked out for today.');
        }
        const checkInTime = new Date(attendance.checkIn);
        // Calculate difference in milliseconds
        const diffMs = now.getTime() - checkInTime.getTime();
        if (diffMs < 0) {
            throw new Error('Check-out time cannot be earlier than check-in time.');
        }
        const totalHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
        // Deduct standard break (e.g. 0.5 hours if working > 4 hrs, 1.0 hour if working > 8 hrs)
        let breakDuration = 0;
        if (totalHours > 8.0) {
            breakDuration = 1.0;
        }
        else if (totalHours > 4.0) {
            breakDuration = 0.5;
        }
        const netWorkingHours = Math.max(0, totalHours - breakDuration);
        const policy = await this.repo.getPolicy();
        let overtime = 0;
        if (netWorkingHours > policy.minimumWorkingHours) {
            overtime = Number((netWorkingHours - policy.minimumWorkingHours).toFixed(2));
        }
        // Determine status update if half-day
        let finalStatus = attendance.status;
        if (netWorkingHours < 4.0) {
            finalStatus = 'Half Day';
        }
        const updated = await this.repo.updateAttendance(attendance.id, {
            checkOut: now,
            workingHours: new client_2.Prisma.Decimal(netWorkingHours),
            breakDuration: new client_2.Prisma.Decimal(breakDuration),
            overtime: new client_2.Prisma.Decimal(overtime),
            status: finalStatus,
            updatedBy: userId,
        });
        await this.repo.createAuditLog({
            user: userId ? { connect: { id: userId } } : undefined,
            action: 'CHECK_OUT',
            details: `Checked out at ${now.toISOString()}. Hours: ${netWorkingHours}, OT: ${overtime}`,
            ipAddress: data.ipAddress,
            userAgent: data.deviceInfo,
        });
        await this.repo.createNotification({
            user: { connect: { id: userId } },
            title: 'Checked Out Successfully',
            message: `Your check-out has been registered at ${now.toLocaleTimeString()}. Worked ${netWorkingHours} hours.`,
            type: 'checkout',
        });
        return updated;
    }
    // -------------------------------------------------------------
    // Manual Requests
    // -------------------------------------------------------------
    async submitRequest(userId, data) {
        if (!data.date || !data.reason) {
            throw new Error('Date and Reason are required.');
        }
        const requestDate = new Date(data.date);
        // Verify if attendance already exists
        const existingAttendance = await this.repo.findTodayAttendance(userId, data.date);
        if (existingAttendance && existingAttendance.status !== 'Absent') {
            throw new Error('Attendance record already exists for this date.');
        }
        const request = await this.repo.createRequest({
            user: { connect: { id: userId } },
            date: requestDate,
            reason: data.reason,
            notes: data.notes || null,
            status: 'pending',
            createdBy: userId,
        });
        // Notify admins
        const admins = await client_1.default.user.findMany({
            where: { role: 'admin', isActive: true, deletedAt: null },
        });
        for (const admin of admins) {
            await this.repo.createNotification({
                user: { connect: { id: admin.id } },
                title: 'New Manual Attendance Request',
                message: `An employee has requested manual attendance for ${data.date}.`,
                type: 'new_attendance_request',
            });
        }
        await this.repo.createAuditLog({
            user: userId ? { connect: { id: userId } } : undefined,
            action: 'SUBMIT_MANUAL_REQUEST',
            details: `Submitted manual request for ${data.date}. Reason: ${data.reason}`,
        });
        return request;
    }
    async getRequests(actorId, actorRole, filters) {
        if (actorRole !== 'admin') {
            return this.repo.getRequests({ userId: actorId, status: filters.status });
        }
        return this.repo.getRequests(filters);
    }
    async processRequest(requestId, status, adminRemarks, adminId) {
        const request = await this.repo.findRequestById(requestId);
        if (!request) {
            throw new Error('Manual attendance request not found.');
        }
        if (request.status !== 'pending') {
            throw new Error('This request has already been processed.');
        }
        // Update request status
        const updatedRequest = await this.repo.updateRequest(requestId, {
            status,
            adminRemarks,
            approvedAt: status === 'approved' ? new Date() : null,
            approvedBy: status === 'approved' ? adminId : null,
            updatedBy: adminId,
        });
        // Handle attendance creation/update if approved
        if (status === 'approved') {
            const dateStr = request.date.toISOString().split('T')[0];
            const existingAttendance = await this.repo.findTodayAttendance(request.userId, dateStr);
            const policy = await this.repo.getPolicy();
            const [startHour, startMin] = policy.officeStartTime.split(':').map(Number);
            const [endHour, endMin] = policy.officeEndTime.split(':').map(Number);
            const mockCheckIn = new Date(request.date);
            mockCheckIn.setHours(startHour, startMin, 0, 0);
            const mockCheckOut = new Date(request.date);
            mockCheckOut.setHours(endHour, endMin, 0, 0);
            const workingHours = policy.minimumWorkingHours;
            if (existingAttendance) {
                await this.repo.updateAttendance(existingAttendance.id, {
                    status: 'Present',
                    source: 'Manual Approval',
                    checkIn: mockCheckIn,
                    checkOut: mockCheckOut,
                    workingHours: new client_2.Prisma.Decimal(workingHours),
                    adminRemarks,
                    updatedBy: adminId,
                });
            }
            else {
                await this.repo.createAttendance({
                    user: { connect: { id: request.userId } },
                    date: request.date,
                    status: 'Present',
                    source: 'Manual Approval',
                    checkIn: mockCheckIn,
                    checkOut: mockCheckOut,
                    workingHours: new client_2.Prisma.Decimal(workingHours),
                    adminRemarks,
                    createdBy: adminId,
                });
            }
        }
        // Send notifications
        await this.repo.createNotification({
            user: { connect: { id: request.userId } },
            title: status === 'approved' ? 'Attendance Request Approved' : 'Attendance Request Rejected',
            message: `Your manual attendance request for ${request.date.toISOString().split('T')[0]} has been ${status}. Remarks: ${adminRemarks || 'None'}`,
            type: status === 'approved' ? 'attendance_approved' : 'attendance_rejected',
        });
        await this.repo.createAuditLog({
            user: adminId ? { connect: { id: adminId } } : undefined,
            action: status === 'approved' ? 'APPROVE_MANUAL_REQUEST' : 'REJECT_MANUAL_REQUEST',
            details: `Processed manual request ID: ${requestId} for user ID: ${request.userId} as ${status}. Remarks: ${adminRemarks}`,
        });
        return updatedRequest;
    }
    // -------------------------------------------------------------
    // Stats and Streaks
    // -------------------------------------------------------------
    async getAttendanceHistory(filters) {
        return this.repo.getAttendanceHistory(filters);
    }
    async getDashboardStats(userId) {
        const now = new Date();
        // Start of the month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const monthlyRecords = await this.repo.getAttendanceHistory({
            userId,
            startDate: startOfMonth,
            endDate: endOfMonth,
        });
        const policy = await this.repo.getPolicy();
        const workingDaysArray = policy.workingDays.split(',').map(Number); // e.g. [1,2,3,4,5]
        let presentDays = 0;
        let absentDays = 0;
        let lateDays = 0;
        let leaves = 0;
        let totalWorkingHours = 0;
        let totalOvertime = 0;
        // Filter statuses
        monthlyRecords.forEach((r) => {
            if (r.status === 'Present' || r.status === 'Late' || r.status === 'Half Day') {
                presentDays++;
            }
            if (r.status === 'Late') {
                lateDays++;
            }
            if (r.status === 'Absent') {
                absentDays++;
            }
            if (r.status === 'Leave') {
                leaves++;
            }
            if (r.workingHours) {
                totalWorkingHours += Number(r.workingHours);
            }
            if (r.overtime) {
                totalOvertime += Number(r.overtime);
            }
        });
        // Calculate total expected working days in the month so far
        let expectedDays = 0;
        const currentDay = now.getDate();
        const holidays = await this.repo.getHolidays(false);
        for (let d = 1; d <= currentDay; d++) {
            const checkDate = new Date(now.getFullYear(), now.getMonth(), d);
            const dayOfWeek = checkDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
            // map JS day of week to policy day (1=Mon, 2=Tue, ..., 7=Sun)
            const policyDay = dayOfWeek === 0 ? 7 : dayOfWeek;
            if (workingDaysArray.includes(policyDay)) {
                // Check if it was a holiday
                const isHoliday = holidays.some((h) => h.date.toDateString() === checkDate.toDateString());
                if (!isHoliday) {
                    expectedDays++;
                }
            }
        }
        // Attendance percentage
        const attendancePercentage = expectedDays > 0
            ? Math.min(100, Math.round((presentDays / expectedDays) * 100))
            : 100;
        // Streaks calculation
        const allRecords = await this.repo.getAttendanceHistory({ userId });
        const { currentStreak, longestStreak } = this.calculateStreaks(allRecords, workingDaysArray);
        return {
            presentDays,
            absentDays,
            lateDays,
            leaves,
            workingHours: Number(totalWorkingHours.toFixed(2)),
            overtime: Number(totalOvertime.toFixed(2)),
            attendancePercentage,
            currentStreak,
            longestStreak,
        };
    }
    calculateStreaks(records, workingDaysArray) {
        // Records are sorted descending by date
        if (records.length === 0) {
            return { currentStreak: 0, longestStreak: 0 };
        }
        const attendanceDates = new Set(records
            .filter((r) => ['Present', 'Late', 'Half Day', 'Manual Approval'].includes(r.status) || (r.checkIn && r.status !== 'Absent'))
            .map((r) => r.date.toDateString()));
        let currentStreak = 0;
        let longestStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Sort dates ascending
        const sortedHistory = Array.from(attendanceDates).map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
        if (sortedHistory.length === 0) {
            return { currentStreak: 0, longestStreak: 0 };
        }
        // Longest Streak
        let tempStreak = 0;
        let prevDate = null;
        for (const d of sortedHistory) {
            if (!prevDate) {
                tempStreak = 1;
            }
            else {
                const diffDays = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    tempStreak++;
                }
                else if (diffDays > 1) {
                    // Check if intermediate days were all weekends/holidays
                    let onlyWeekendOrHolidays = true;
                    for (let step = 1; step < diffDays; step++) {
                        const interDate = new Date(prevDate);
                        interDate.setDate(interDate.getDate() + step);
                        const dayOfWeek = interDate.getDay();
                        const policyDay = dayOfWeek === 0 ? 7 : dayOfWeek;
                        if (workingDaysArray.includes(policyDay)) {
                            onlyWeekendOrHolidays = false;
                            break;
                        }
                    }
                    if (onlyWeekendOrHolidays) {
                        tempStreak++;
                    }
                    else {
                        tempStreak = 1;
                    }
                }
            }
            prevDate = d;
            if (tempStreak > longestStreak) {
                longestStreak = tempStreak;
            }
        }
        // Current Streak
        let checkDate = new Date(today);
        let keepChecking = true;
        while (keepChecking) {
            const dayOfWeek = checkDate.getDay();
            const policyDay = dayOfWeek === 0 ? 7 : dayOfWeek;
            if (attendanceDates.has(checkDate.toDateString())) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            }
            else if (!workingDaysArray.includes(policyDay)) {
                // Skip weekend
                checkDate.setDate(checkDate.getDate() - 1);
            }
            else {
                // Check if checkDate is today, might not have marked check-in yet, skip to yesterday
                if (checkDate.toDateString() === today.toDateString()) {
                    checkDate.setDate(checkDate.getDate() - 1);
                }
                else {
                    keepChecking = false;
                }
            }
            // Safeguard
            if (currentStreak > 365)
                break;
        }
        return { currentStreak, longestStreak };
    }
    // -------------------------------------------------------------
    // Reports
    // -------------------------------------------------------------
    async generateReportData(filters) {
        // If filtering by department, fetch users in department first
        let userIds = undefined;
        if (filters.department) {
            const usersInDept = await client_1.default.user.findMany({
                where: { department: filters.department, deletedAt: null },
                select: { id: true },
            });
            userIds = usersInDept.map((u) => u.id);
        }
        if (filters.userId) {
            userIds = [filters.userId];
        }
        const whereClause = { deletedAt: null };
        if (userIds !== undefined) {
            whereClause.userId = { in: userIds };
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
                        employeeId: true,
                    },
                },
            },
            orderBy: { date: 'asc' },
        });
    }
    // -------------------------------------------------------------
    // Notifications helpers
    // -------------------------------------------------------------
    async getNotifications(userId) {
        return this.repo.getNotifications(userId);
    }
    async markNotificationRead(id) {
        return this.repo.markNotificationRead(id);
    }
    // -------------------------------------------------------------
    // Audit Logs
    // -------------------------------------------------------------
    async getAuditLogs() {
        return this.repo.getAuditLogs();
    }
}
exports.AttendanceService = AttendanceService;
