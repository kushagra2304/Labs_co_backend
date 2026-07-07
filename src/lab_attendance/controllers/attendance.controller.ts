import { Request, Response } from 'express';
import { AttendanceService } from '../services/attendance.service';

export class AttendanceController {
  constructor(private service = new AttendanceService()) {}

  // Policy
  getPolicy = async (_req: Request, res: Response): Promise<void> => {
    try {
      const policy = await this.service.getPolicy();
      res.status(200).json({ success: true, data: policy });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  updatePolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      const actorId = req.user!.id;
      const policy = await this.service.updatePolicy(req.body.id, req.body, actorId);
      res.status(200).json({ success: true, data: policy });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  // WiFi
  getWifiList = async (req: Request, res: Response): Promise<void> => {
    try {
      const includeDeleted = req.user!.role === 'admin';
      const wifis = await this.service.getWifiList(includeDeleted);
      res.status(200).json({ success: true, data: wifis });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  addWifi = async (req: Request, res: Response): Promise<void> => {
    try {
      const actorId = req.user!.id;
      const wifi = await this.service.addWifi(req.body, actorId);
      res.status(201).json({ success: true, data: wifi });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  updateWifi = async (req: Request, res: Response): Promise<void> => {
    try {
      const actorId = req.user!.id;
      const wifi = await this.service.updateWifi(req.params.id as string, req.body, actorId);
      res.status(200).json({ success: true, data: wifi });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  deleteWifi = async (req: Request, res: Response): Promise<void> => {
    try {
      const actorId = req.user!.id;
      const wifi = await this.service.deleteWifi(req.params.id as string, actorId);
      res.status(200).json({ success: true, data: wifi });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  restoreWifi = async (req: Request, res: Response): Promise<void> => {
    try {
      const actorId = req.user!.id;
      const wifi = await this.service.restoreWifi(req.params.id as string, actorId);
      res.status(200).json({ success: true, data: wifi });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  // Holidays
  getHolidays = async (req: Request, res: Response): Promise<void> => {
    try {
      const includeDeleted = req.user!.role === 'admin';
      const holidays = await this.service.getHolidays(includeDeleted);
      res.status(200).json({ success: true, data: holidays });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  addHoliday = async (req: Request, res: Response): Promise<void> => {
    try {
      const actorId = req.user!.id;
      const holiday = await this.service.addHoliday(req.body, actorId);
      res.status(201).json({ success: true, data: holiday });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  deleteHoliday = async (req: Request, res: Response): Promise<void> => {
    try {
      const actorId = req.user!.id;
      const holiday = await this.service.deleteHoliday(req.params.id as string, actorId);
      res.status(200).json({ success: true, data: holiday });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  // Check In/Out
  checkIn = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const record = await this.service.checkIn(userId, req.body);
      res.status(200).json({ success: true, data: record });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  checkOut = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const record = await this.service.checkOut(userId, req.body);
      res.status(200).json({ success: true, data: record });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  getTodayStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const repo = this.service['repo']; // access the repo
      const attendance = await repo.findTodayAttendance(userId, dateStr);
      res.status(200).json({ success: true, data: attendance });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  // Manual Requests
  submitRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const request = await this.service.submitRequest(userId, req.body);
      res.status(201).json({ success: true, data: request });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  getRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const actorId = req.user!.id;
      const role = req.user!.role;
      const filters = {
        userId: req.query.userId as string,
        status: req.query.status as string,
      };
      const requests = await this.service.getRequests(actorId, role, filters);
      res.status(200).json({ success: true, data: requests });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  processRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = req.user!.id;
      const { status, adminRemarks } = req.body;
      if (!['approved', 'rejected'].includes(status)) {
        throw new Error('Status must be approved or rejected.');
      }
      const request = await this.service.processRequest(req.params.id as string, status, adminRemarks, adminId);
      res.status(200).json({ success: true, data: request });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  // Stats and History
  getHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const actorId = req.user!.id;
      const role = req.user!.role;

      let targetUserId = actorId;
      if (role === 'admin' && req.query.userId) {
        targetUserId = req.query.userId as string;
      }

      const filters: any = { userId: targetUserId };
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }
      if (req.query.status) {
        filters.status = req.query.status as string;
      }

      const history = await this.service.getAttendanceHistory(filters);
      res.status(200).json({ success: true, data: history });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const actorId = req.user!.id;
      const role = req.user!.role;

      let targetUserId = actorId;
      if (role === 'admin' && req.query.userId) {
        targetUserId = req.query.userId as string;
      }

      const stats = await this.service.getDashboardStats(targetUserId);
      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getReports = async (req: Request, res: Response): Promise<void> => {
    try {
      const actorId = req.user!.id;
      const role = req.user!.role;

      const filters: any = {};
      if (role !== 'admin') {
        filters.userId = actorId;
      } else {
        if (req.query.userId) filters.userId = req.query.userId as string;
        if (req.query.department) filters.department = req.query.department as string;
      }

      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      const data = await this.service.generateReportData(filters);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  // Notifications
  getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const list = await this.service.getNotifications(userId);
      res.status(200).json({ success: true, data: list });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  markNotificationRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const item = await this.service.markNotificationRead(req.params.id as string);
      res.status(200).json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  // Audit Logs
  getAuditLogs = async (_req: Request, res: Response): Promise<void> => {
    try {
      const logs = await this.service.getAuditLogs();
      res.status(200).json({ success: true, data: logs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}
