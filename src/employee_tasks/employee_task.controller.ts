import { Request, Response } from 'express';
import { EmployeeTaskService } from './employee_task.service';
import { EmployeeTaskFilters } from './employee_task.repository';

export class EmployeeTaskController {
  constructor(private employeeTaskService = new EmployeeTaskService()) {}

  listTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const employeeId = req.user!.id;
      const filters: EmployeeTaskFilters = {
        status: req.query.status ? String(req.query.status) : undefined,
        priority: req.query.priority ? String(req.query.priority) : undefined,
        taskType: req.query.taskType ? String(req.query.taskType) : undefined,
        dueDate: req.query.dueDate ? String(req.query.dueDate) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        sortBy: req.query.sortBy ? String(req.query.sortBy) : undefined,
        sortOrder: req.query.sortOrder === 'desc' ? 'desc' : 'asc',
      };

      const tasks = await this.employeeTaskService.getTasks(employeeId, filters);
      res.status(200).json({
        success: true,
        data: tasks,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch tasks',
      });
    }
  };

  getTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const employeeId = req.user!.id;

      const task = await this.employeeTaskService.getTaskById(id, employeeId);
      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error: any) {
      const status = error.message.includes('Unauthorized') ? 403 : (error.message.includes('not found') ? 404 : 500);
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to fetch task',
      });
    }
  };

  createPersonalTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const employeeId = req.user!.id;
      const { title, description, priority, dueDate, estimatedHours } = req.body;

      const parsedHours = estimatedHours !== undefined && estimatedHours !== null && estimatedHours !== ''
        ? Number(estimatedHours)
        : null;

      if (parsedHours !== null && isNaN(parsedHours)) {
        res.status(400).json({
          success: false,
          error: 'Estimated hours must be a valid number',
        });
        return;
      }

      const task = await this.employeeTaskService.createPersonalTask(
        {
          title,
          description,
          priority,
          dueDate,
          estimatedHours: parsedHours,
        },
        employeeId
      );

      res.status(201).json({
        success: true,
        data: task,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create personal task',
      });
    }
  };

  updatePersonalTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const employeeId = req.user!.id;
      const { title, description, priority, dueDate, estimatedHours, status } = req.body;

      const parsedHours = estimatedHours !== undefined && estimatedHours !== null && estimatedHours !== ''
        ? Number(estimatedHours)
        : null;

      if (parsedHours !== null && isNaN(parsedHours)) {
        res.status(400).json({
          success: false,
          error: 'Estimated hours must be a valid number',
        });
        return;
      }

      const task = await this.employeeTaskService.updatePersonalTask(
        id,
        {
          title,
          description,
          priority,
          dueDate,
          estimatedHours: parsedHours,
          status,
        },
        employeeId
      );

      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error: any) {
      const status = error.message.includes('Unauthorized') ? 403 : (error.message.includes('not found') ? 404 : 400);
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to update personal task',
      });
    }
  };

  deletePersonalTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const employeeId = req.user!.id;

      await this.employeeTaskService.softDeletePersonalTask(id, employeeId);

      res.status(200).json({
        success: true,
        message: 'Personal task deleted successfully',
      });
    } catch (error: any) {
      const status = error.message.includes('Unauthorized') ? 403 : (error.message.includes('not found') ? 404 : 550);
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to delete personal task',
      });
    }
  };

  updateTaskStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const employeeId = req.user!.id;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Status value is required',
        });
        return;
      }

      const task = await this.employeeTaskService.updateTaskStatus(id, status, employeeId);

      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error: any) {
      const status = error.message.includes('Unauthorized') ? 403 : (error.message.includes('not found') ? 404 : 400);
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to update task status',
      });
    }
  };

  addTaskProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const employeeId = req.user!.id;
      const { note } = req.body;

      const progressUpdate = await this.employeeTaskService.addTaskProgress(id, note, employeeId);

      res.status(201).json({
        success: true,
        data: progressUpdate,
      });
    } catch (error: any) {
      const status = error.message.includes('Unauthorized') ? 403 : (error.message.includes('not found') ? 404 : 400);
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to add progress update',
      });
    }
  };
}
