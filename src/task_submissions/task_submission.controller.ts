import { Request, Response } from 'express';
import { TaskSubmissionService } from './task_submission.service';
import { TaskSubmissionFilters } from './task_submission.repository';

export class TaskSubmissionController {
  constructor(private service = new TaskSubmissionService()) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: TaskSubmissionFilters = {
        status: req.query.status ? String(req.query.status) : undefined,
        employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
        taskId: req.query.taskId ? String(req.query.taskId) : undefined,
        page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
      };

      const result = await this.service.list(filters);
      res.status(200).json({
        success: true,
        data: result.submissions,
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
        error: error.message || 'Failed to fetch task submissions',
      });
    }
  };

  get = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const submission = await this.service.getById(id);
      res.status(200).json({ success: true, data: submission });
    } catch (error: any) {
      const status = error.message === 'Submission not found' ? 404 : 500;
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to fetch task submission',
      });
    }
  };

  review = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const reviewerId = req.user!.id;
      const { status, adminRemarks } = req.body;

      if (!status) {
        res.status(400).json({ success: false, error: 'Status is required' });
        return;
      }

      const updated = await this.service.review(
        id,
        status,
        adminRemarks ? String(adminRemarks) : null,
        reviewerId,
        req.app.get('io')
      );

      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      const status = error.message === 'Submission not found' ? 404 : 400;
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to review task submission',
      });
    }
  };
}
