"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskSubmissionRepository = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const submissionInclude = {
    task: {
        select: {
            id: true,
            title: true,
            priority: true,
            status: true,
            dueDate: true,
            adminVerifiedAt: true,
        },
    },
    submitter: {
        select: { id: true, name: true, email: true, avatarUrl: true },
    },
    reviewer: {
        select: { id: true, name: true, email: true },
    },
    file: true,
};
class TaskSubmissionRepository {
    async findAll(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;
        const where = { deletedAt: null };
        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.employeeId) {
            where.submittedBy = filters.employeeId;
        }
        if (filters.taskId) {
            where.taskId = filters.taskId;
        }
        const [submissions, total] = await Promise.all([
            client_1.default.taskSubmission.findMany({
                where,
                include: submissionInclude,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            client_1.default.taskSubmission.count({ where }),
        ]);
        return { submissions, total, page, limit };
    }
    async findById(id) {
        return client_1.default.taskSubmission.findFirst({
            where: { id, deletedAt: null },
            include: submissionInclude,
        });
    }
    async review(id, data) {
        return client_1.default.taskSubmission.update({
            where: { id },
            data: {
                status: data.status,
                adminRemarks: data.adminRemarks,
                reviewedBy: data.reviewedBy,
                reviewedAt: new Date(),
            },
            include: submissionInclude,
        });
    }
}
exports.TaskSubmissionRepository = TaskSubmissionRepository;
