import prisma from '../prisma/client';
import { Prisma, SubmissionStatus } from '@prisma/client';

export interface TaskSubmissionFilters {
  status?: string;
  employeeId?: string;
  taskId?: string;
  page?: number;
  limit?: number;
}

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
} satisfies Prisma.TaskSubmissionInclude;

export type TaskSubmissionWithRelations = Prisma.TaskSubmissionGetPayload<{ include: typeof submissionInclude }>;

export interface PaginatedSubmissions {
  submissions: TaskSubmissionWithRelations[];
  total: number;
  page: number;
  limit: number;
}

export class TaskSubmissionRepository {
  async findAll(filters: TaskSubmissionFilters): Promise<PaginatedSubmissions> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskSubmissionWhereInput = { deletedAt: null };

    if (filters.status) {
      where.status = filters.status as SubmissionStatus;
    }
    if (filters.employeeId) {
      where.submittedBy = filters.employeeId;
    }
    if (filters.taskId) {
      where.taskId = filters.taskId;
    }

    const [submissions, total] = await Promise.all([
      prisma.taskSubmission.findMany({
        where,
        include: submissionInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.taskSubmission.count({ where }),
    ]);

    return { submissions, total, page, limit };
  }

  async findById(id: string): Promise<TaskSubmissionWithRelations | null> {
    return prisma.taskSubmission.findFirst({
      where: { id, deletedAt: null },
      include: submissionInclude,
    });
  }

  async review(
    id: string,
    data: { status: SubmissionStatus; adminRemarks: string | null; reviewedBy: string }
  ): Promise<TaskSubmissionWithRelations> {
    return prisma.taskSubmission.update({
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
