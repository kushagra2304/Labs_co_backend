import { Request, Response } from 'express';
import { TaskService } from './task.service';
import { TaskFilters } from './task.repository';

export class TaskController {
  constructor(private taskService = new TaskService()) {}

  listTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: TaskFilters = {
        employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        priority: req.query.priority ? String(req.query.priority) : undefined,
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
        sortBy: req.query.sortBy ? String(req.query.sortBy) : undefined,
        sortOrder: req.query.sortOrder === 'desc' ? 'desc' : 'asc',
      };

      const result = await this.taskService.getTasks(filters);
      res.status(200).json({
        success: true,
        data: result.tasks,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
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
      const task = await this.taskService.getTaskById(id);
      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error: any) {
      const status = error.message === 'Task not found' ? 404 : 500;
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to fetch task',
      });
    }
  };

  createTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const actorId = req.user!.id;
      const { title, description, assignedTo, priority, status, dueDate, estimatedHours } = req.body;

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

      const task = await this.taskService.createTask(
        {
          title,
          description,
          assignedTo,
          priority,
          status,
          dueDate,
          estimatedHours: parsedHours,
        },
        actorId
      );

      res.status(201).json({
        success: true,
        data: task,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create task',
      });
    }
  };

  updateTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const actorId = req.user!.id;
      const { title, description, assignedTo, priority, status, dueDate, estimatedHours } = req.body;

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

      const task = await this.taskService.updateTask(
        id,
        {
          title,
          description,
          assignedTo,
          priority,
          status,
          dueDate,
          estimatedHours: parsedHours,
        },
        actorId
      );

      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error: any) {
      const status = error.message === 'Task not found' ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to update task',
      });
    }
  };

  deleteTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const actorId = req.user!.id;

      await this.taskService.softDeleteTask(id, actorId);

      res.status(200).json({
        success: true,
        message: 'Task soft deleted successfully',
      });
    } catch (error: any) {
      const status = error.message === 'Task not found' ? 404 : 500;
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to delete task',
      });
    }
  };
}
