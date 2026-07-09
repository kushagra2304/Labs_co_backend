import { Server } from 'socket.io';
import { SubmissionStatus } from '@prisma/client';
import {
  TaskSubmissionRepository,
  TaskSubmissionFilters,
  PaginatedSubmissions,
  TaskSubmissionWithRelations,
} from './task_submission.repository';
import { publishActivity } from '../helpers/notification.helper';

const REVIEWABLE_STATUSES = ['accepted', 'declined'];

export class TaskSubmissionService {
  constructor(private repo = new TaskSubmissionRepository()) {}

  async list(filters: TaskSubmissionFilters): Promise<PaginatedSubmissions> {
    return this.repo.findAll(filters);
  }

  async getById(id: string): Promise<TaskSubmissionWithRelations> {
    const submission = await this.repo.findById(id);
    if (!submission) {
      throw new Error('Submission not found');
    }
    return submission;
  }

  async review(
    id: string,
    status: string,
    adminRemarks: string | null,
    reviewerId: string,
    io?: Server
  ): Promise<TaskSubmissionWithRelations> {
    if (!status || !REVIEWABLE_STATUSES.includes(status.toLowerCase())) {
      throw new Error(`Status must be one of: ${REVIEWABLE_STATUSES.join(', ')}`);
    }

    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new Error('Submission not found');
    }
    if (existing.status !== SubmissionStatus.pending) {
      throw new Error('This submission has already been reviewed');
    }

    const normalizedStatus = status.toLowerCase() as SubmissionStatus;
    const updated = await this.repo.review(id, {
      status: normalizedStatus,
      adminRemarks,
      reviewedBy: reviewerId,
    });

    const isAccepted = normalizedStatus === SubmissionStatus.accepted;
    await publishActivity({
      userId: updated.submittedBy,
      type: 'task_submission_result',
      title: isAccepted ? 'Submission accepted' : 'Submission declined',
      body: isAccepted
        ? `Your file for "${updated.task.title}" was accepted. The admin will finalize the task shortly.`
        : `Your file for "${updated.task.title}" was declined.${adminRemarks ? ` Reason: ${adminRemarks}` : ''}`,
      relatedId: updated.taskId,
      relatedType: 'Task',
      io,
    });

    return updated;
  }
}
