"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectFilesRepository = exports.FILE_LIFESPAN_DAYS = exports.REVIEW_WINDOW_DAYS = void 0;
const client_1 = __importDefault(require("../prisma/client"));
// A file is in the "review window" for the last REVIEW_WINDOW_DAYS days of
// its 30-day lifespan (day 25-29 of 30) before the auto-delete job removes
// it on day 30.
exports.REVIEW_WINDOW_DAYS = 5;
exports.FILE_LIFESPAN_DAYS = 30;
class ProjectFilesRepository {
    // ── Storage usage per project (for the folder grid) ─────────────────────
    async findProjectsWithUsage() {
        const [projects, usage] = await Promise.all([
            client_1.default.project.findMany({
                where: { deletedAt: null },
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
            client_1.default.file.groupBy({
                by: ['projectId'],
                where: { deletedAt: null, projectId: { not: null } },
                _sum: { sizeKb: true },
                _count: { id: true },
            }),
        ]);
        const usageByProject = new Map(usage.map((u) => [u.projectId, u]));
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
    async findByProject(projectId) {
        return client_1.default.file.findMany({
            where: { projectId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            include: {
                uploader: { select: { id: true, name: true, email: true } },
            },
        });
    }
    async findById(id) {
        return client_1.default.file.findFirst({
            where: { id, deletedAt: null },
            include: {
                project: { select: { id: true, name: true } },
            },
        });
    }
    async create(data) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + exports.FILE_LIFESPAN_DAYS);
        return client_1.default.file.create({
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
    async softDelete(id) {
        return client_1.default.file.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    // Admin chose to keep a file that was up for review — exempts it from
    // auto-deletion permanently (per product decision: no automatic re-review,
    // an admin would need to delete it manually from the folder view later).
    async keepForever(id, actorId) {
        return client_1.default.file.update({
            where: { id },
            data: {
                expiresAt: null,
                keptAt: new Date(),
                keptBy: actorId,
            },
        });
    }
    // ── Review window (day 25-29) ───────────────────────────────────────────
    async findNeedingReview() {
        const now = new Date();
        const horizon = new Date(now.getTime() + exports.REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
        return client_1.default.file.findMany({
            where: {
                deletedAt: null,
                expiresAt: { not: null, gt: now, lte: horizon },
            },
            orderBy: { expiresAt: 'asc' },
            include: {
                project: { select: { id: true, name: true } },
            },
        });
    }
    // ── Expired files (day 30) — consumed by the auto-delete job ────────────
    async findExpired() {
        const now = new Date();
        return client_1.default.file.findMany({
            where: {
                deletedAt: null,
                expiresAt: { not: null, lte: now },
            },
        });
    }
}
exports.ProjectFilesRepository = ProjectFilesRepository;
