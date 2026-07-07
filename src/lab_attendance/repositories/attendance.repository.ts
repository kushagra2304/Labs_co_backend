import prisma from '../../prisma/client';
import { Prisma } from '@prisma/client';

export class AttendanceRepository {
  // -------------------------------------------------------------
  // Attendance Policy
  // -------------------------------------------------------------
  async getPolicy() {
    let policy = await prisma.attendancePolicy.findFirst({
      where: { deletedAt: null },
    });
    if (!policy) {
      policy = await prisma.attendancePolicy.create({
        data: {
          officeStartTime: '09:00',
          officeEndTime: '18:00',
          gracePeriod: 15,
          lateMinutes: 30,
          minimumWorkingHours: 8.0,
          maximumWorkingHours: 12.0,
          autoCheckout: true,
          workingDays: '1,2,3,4,5',
        },
      });
    }
    return policy;
  }

  async updatePolicy(id: string, data: Partial<Prisma.AttendancePolicyUpdateInput>) {
    return prisma.attendancePolicy.update({
      where: { id },
      data,
    });
  }

  // -------------------------------------------------------------
  // Office WiFi
  // -------------------------------------------------------------
  async getWifiList(includeDeleted = false) {
    return prisma.officeWifi.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: { officeName: 'asc' },
    });
  }

  async findWifiById(id: string) {
    return prisma.officeWifi.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findWifiByBssid(bssid: string) {
    return prisma.officeWifi.findFirst({
      where: { bssid, deletedAt: null },
    });
  }

  async createWifi(data: Prisma.OfficeWifiCreateInput) {
    return prisma.officeWifi.create({ data });
  }

  async updateWifi(id: string, data: Prisma.OfficeWifiUpdateInput) {
    return prisma.officeWifi.update({
      where: { id },
      data,
    });
  }

  async softDeleteWifi(id: string, actorId: string) {
    return prisma.officeWifi.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actorId,
        isDeleted: true,
      },
    });
  }

  async restoreWifi(id: string) {
    return prisma.officeWifi.update({
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
    return prisma.holiday.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: { date: 'asc' },
    });
  }

  async findHolidayById(id: string) {
    return prisma.holiday.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async createHoliday(data: Prisma.HolidayCreateInput) {
    return prisma.holiday.create({ data });
  }

  async softDeleteHoliday(id: string, actorId: string) {
    return prisma.holiday.update({
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
  async createRequest(data: Prisma.AttendanceRequestCreateInput) {
    return prisma.attendanceRequest.create({ data });
  }

  async findRequestById(id: string) {
    return prisma.attendanceRequest.findFirst({
      where: { id, deletedAt: null },
      include: { user: true },
    });
  }

  async getRequests(filters: { userId?: string; status?: string }) {
    const whereClause: Prisma.AttendanceRequestWhereInput = { deletedAt: null };
    if (filters.userId) {
      whereClause.userId = filters.userId;
    }
    if (filters.status) {
      whereClause.status = filters.status;
    }
    return prisma.attendanceRequest.findMany({
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

  async updateRequest(id: string, data: Prisma.AttendanceRequestUpdateInput) {
    return prisma.attendanceRequest.update({
      where: { id },
      data,
    });
  }

  // -------------------------------------------------------------
  // Attendance Records
  // -------------------------------------------------------------
  async findTodayAttendance(userId: string, dateStr: string) {
    // Use a date range spanning the full calendar day to avoid timezone mismatches
    // when querying a @db.Date column which stores UTC midnight.
    const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
    const endOfDay   = new Date(dateStr + 'T23:59:59.999Z');
    return prisma.attendance.findFirst({
      where: {
        userId,
        date: { gte: startOfDay, lte: endOfDay },
        deletedAt: null,
      },
    });
  }

  async createAttendance(data: Prisma.AttendanceCreateInput) {
    return prisma.attendance.create({ data });
  }

  async updateAttendance(id: string, data: Prisma.AttendanceUpdateInput) {
    return prisma.attendance.update({
      where: { id },
      data,
    });
  }

  async getAttendanceHistory(filters: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }) {
    const whereClause: Prisma.AttendanceWhereInput = { deletedAt: null };

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

    return prisma.attendance.findMany({
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

  async createHistoryLog(data: Prisma.AttendanceHistoryCreateInput) {
    return prisma.attendanceHistory.create({ data });
  }

  // -------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------
  async createNotification(data: Prisma.AttendanceNotificationCreateInput) {
    return prisma.attendanceNotification.create({ data });
  }

  async getNotifications(userId: string) {
    return prisma.attendanceNotification.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markNotificationRead(id: string) {
    return prisma.attendanceNotification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  // -------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------
  async createAuditLog(data: Prisma.AuditLogCreateInput) {
    return prisma.auditLog.create({ data });
  }

  async getAuditLogs() {
    return prisma.auditLog.findMany({
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
