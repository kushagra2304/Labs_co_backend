"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskSubmissionService = void 0;
const client_1 = require("@prisma/client");
const task_submission_repository_1 = require("./task_submission.repository");
const notification_helper_1 = require("../helpers/notification.helper");
const REVIEWABLE_STATUSES = ['accepted', 'declined'];
class TaskSubmissionService {
    repo;
    constructor(repo = new task_submission_repository_1.TaskSubmissionRepository()) {
        this.repo = repo;
    }
    async list(filters) {
        return this.repo.findAll(filters);
    }
    async getById(id) {
        const submission = await this.repo.findById(id);
        if (!submission) {
            throw new Error('Submission not found');
        }
        return submission;
    }
    async review(id, status, adminRemarks, reviewerId, io) {
        if (!status || !REVIEWABLE_STATUSES.includes(status.toLowerCase())) {
            throw new Error(`Status must be one of: ${REVIEWABLE_STATUSES.join(', ')}`);
        }
        const existing = await this.repo.findById(id);
        if (!existing) {
            throw new Error('Submission not found');
        }
        if (existing.status !== client_1.SubmissionStatus.pending) {
            throw new Error('This submission has already been reviewed');
        }
        const normalizedStatus = status.toLowerCase();
        const updated = await this.repo.review(id, {
            status: normalizedStatus,
            adminRemarks,
            reviewedBy: reviewerId,
        });
        const isAccepted = normalizedStatus === client_1.SubmissionStatus.accepted;
        await (0, notification_helper_1.publishActivity)({
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
exports.TaskSubmissionService = TaskSubmissionService;
