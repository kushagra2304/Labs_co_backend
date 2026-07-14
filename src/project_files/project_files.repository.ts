import prisma from '../prisma/client';
import { File, FileType } from '@prisma/client';

// A file is in the "review window" for the last REVIEW_WINDOW_DAYS days of
// its 30-day lifespan (day 25-29 of 30) before the auto-delete job removes
// it on day 30.
export const REVIEW_WINDOW_DAYS = 5;
export const FILE_LIFESPAN_DAYS = 30;

export class ProjectFilesRepository {
  // ── Storage usage per project (for the folder grid) ─────────────────────
  async findProjectsWithUsage(): Promise<{
    id: string;
    name: string;
    fileCount: number;
    totalSizeKb: number;
  }[]> {
    const [projects, usage] = await Promise.all([
      prisma.project.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.file.groupBy({
        by: ['projectId'],
        where: { deletedAt: null, projectId: { not: null } },
        _sum: { sizeKb: true },
        _count: { id: true },
      }),
    ]);

    const usageByProject = new Map(usage.map((u) => [u.projectId as string, u]));

    return projects.map((p) => {
      const u = usageByProject.get(p.id);
      return {
        id: p.id,
        name: p.name,
        fileCount: u?._count.id ?? 0,
        totalSizeKb: u?._sum.sizeKb ?? 0,
      };
    });
  }

  // ── Files within a single project folder ────────────────────────────────
  async findByProject(projectId: string): Promise<(File & {
    uploader: { id: string; name: string; email: string } | null;
  })[]> {
    return prisma.file.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: { select: { id: true, name: true, email: true } },
      },
    }) as any;
  }

  async findById(id: string): Promise<(File & {
    project: { id: string; name: string } | null;
  }) | null> {
    return prisma.file.findFirst({
      where: { id, deletedAt: null },
      include: {
        project: { select: { id: true, name: true } },
      },
    }) as any;
  }

  async create(data: {
    name: string;
    fileUrl: string;
    fileType: FileType;
    sizeKb: number;
    r2ObjectKey: string;
    projectId: string;
    uploadedBy: string;
  }): Promise<File> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + FILE_LIFESPAN_DAYS);

    return prisma.file.create({
      data: {
        name: data.name,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        sizeKb: data.sizeKb,
        r2ObjectKey: data.r2ObjectKey,
        projectId: data.projectId,
        uploadedBy: data.uploadedBy,
        expiresAt,
      },
    });
  }

  async softDelete(id: string): Promise<File> {
    return prisma.file.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Admin chose to keep a file that was up for review — exempts it from
  // auto-deletion permanently (per product decision: no automatic re-review,
  // an admin would need to delete it manually from the folder view later).
  async keepForever(id: string, actorId: string): Promise<File> {
    return prisma.file.update({
      where: { id },
      data: {
        expiresAt: null,
        keptAt: new Date(),
        keptBy: actorId,
      },
    });
  }

  // ── Review window (day 25-29) ───────────────────────────────────────────
  async findNeedingReview(): Promise<(File & {
    project: { id: string; name: string } | null;
  })[]> {
    const now = new Date();
    const horizon = new Date(now.getTime() + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    return prisma.file.findMany({
      where: {
        deletedAt: null,
        expiresAt: { not: null, gt: now, lte: horizon },
      },
      orderBy: { expiresAt: 'asc' },
      include: {
        project: { select: { id: true, name: true } },
      },
    }) as any;
  }

  // ── Expired files (day 30) — consumed by the auto-delete job ────────────
  async findExpired(): Promise<File[]> {
    const now = new Date();
    return prisma.file.findMany({
      where: {
        deletedAt: null,
        expiresAt: { not: null, lte: now },
      },
    });
  }
}
