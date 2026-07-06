import { Request, Response } from 'express';
import { TeamService } from './team.service';
import { EmployeeFilters } from './team.repository';

export class TeamController {
  constructor(private teamService = new TeamService()) {}

  listEmployees = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: EmployeeFilters = {
        department: req.query.department ? String(req.query.department) : undefined,
        designation: req.query.designation ? String(req.query.designation) : undefined,
        isActive: req.query.isActive !== undefined
          ? req.query.isActive === 'true'
          : undefined,
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
        sortBy: req.query.sortBy ? String(req.query.sortBy) : undefined,
        sortOrder: req.query.sortOrder === 'desc' ? 'desc' : 'asc',
      };

      const [result, metrics] = await Promise.all([
        this.teamService.getEmployees(filters),
        this.teamService.getSummaryMetrics(),
      ]);

      res.status(200).json({
        success: true,
        data: result.employees,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
        metrics,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch team members',
      });
    }
  };

  getEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const employee = await this.teamService.getEmployeeById(id);
      res.status(200).json({
        success: true,
        data: employee,
      });
    } catch (error: any) {
      const status = error.message === 'Employee not found' ? 404 : 500;
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to fetch employee details',
      });
    }
  };

  createEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
      const actorId = req.user!.id;
      const employee = await this.teamService.createEmployee(req.body, actorId);
      res.status(201).json({
        success: true,
        data: employee,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to add team member',
      });
    }
  };

  updateEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const actorId = req.user!.id;

      const employee = await this.teamService.updateEmployee(id, req.body, actorId);
      res.status(200).json({
        success: true,
        data: employee,
      });
    } catch (error: any) {
      const status = error.message === 'Employee not found' ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to update team member details',
      });
    }
  };

  deleteEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const actorId = req.user!.id;

      await this.teamService.softDeleteEmployee(id, actorId);

      res.status(200).json({
        success: true,
        message: 'Team member account deleted successfully',
      });
    } catch (error: any) {
      const status = error.message === 'Employee not found' ? 404 : 500;
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to delete team member account',
      });
    }
  };
}
