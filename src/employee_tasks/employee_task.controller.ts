import { Request, Response } from 'express';
import { EmployeeTaskService } from './employee_task.service';
import { EmployeeTaskFilters } from './employee_task.repository';
import { TaskFileService } from './task-file.service';
import { publishActivity } from '../helpers/notification.helper';
import prisma from '../prisma/client';

export class EmployeeTaskController {
  constructor(
    private employeeTaskService = new EmployeeTaskService(),
    private taskFileService = new TaskFileService()
  ) {}

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

  listPendingAcknowledgment = async (req: Request, res: Response): Promise<void> => {
    try {
      const employeeId = req.user!.id;
      const tasks = await this.employeeTaskService.getPendingAcknowledgment(employeeId);
      res.status(200).json({ success: true, data: tasks });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch pending acknowledgments',
      });
    }
  };

  acknowledgeTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const employeeId = req.user!.id;

      const task = await this.employeeTaskService.acknowledgeTask(id, employeeId);

      if (task.assignedBy) {
        await publishActivity({
          userId: task.assignedBy,
          type: 'task_assigned',
          title: 'Task acknowledged',
          body: `"${task.title}" was acknowledged and is now underway.`,
          relatedId: task.id,
          relatedType: 'Task',
          io: req.app.get('io'),
        });
      }

      res.status(200).json({ success: true, data: task });
    } catch (error: any) {
      const status = error.message.includes('Unauthorized')
        ? 403
        : error.message.includes('not found')
        ? 404
        : 400;
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to acknowledge task',
      });
    }
  };

  submitCompletion = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const employeeId = req.user!.id;
      const note = req.body.note ? String(req.body.note) : null;

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'A file attachment (image, PDF, DWG, or document) is required to submit this task as completed',
        });
        return;
      }

      const uploaded = await this.taskFileService.uploadCompletionFile(req.file);

      const submission = await this.employeeTaskService.submitCompletion(
        id,
        employeeId,
        uploaded,
        note
      );

      // Notify the admin who assigned the task (fallback: all admins) that a
      // completion file is awaiting review.
      const task = await this.employeeTaskService.getTaskById(id, employeeId);
      const reviewerIds = task.assignedBy
        ? [task.assignedBy]
        : (await prisma.user.findMany({ where: { role: 'admin', isActive: true, deletedAt: null }, select: { id: true } })).map((u) => u.id);

      for (const reviewerId of reviewerIds) {
        await publishActivity({
          userId: reviewerId,
          type: 'task_submission_review',
          title: 'Task submission awaiting review',
          body: `A completion file was submitted for "${task.title}" and needs your review.`,
          relatedId: id,
          relatedType: 'Task',
          io: req.app.get('io'),
        });
      }

      res.status(201).json({ success: true, data: submission });
    } catch (error: any) {
      const status = error.message.includes('Unauthorized')
        ? 403
        : error.message.includes('not found')
        ? 404
        : 400;
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to submit task completion',
      });
    }
  };
}
