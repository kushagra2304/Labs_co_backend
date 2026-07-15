"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectFilesService = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const project_files_repository_1 = require("./project_files.repository");
const project_file_storage_service_1 = require("./project-file-storage.service");
class ProjectFilesService {
    repo;
    storage;
    constructor(repo = new project_files_repository_1.ProjectFilesRepository(), storage = new project_file_storage_service_1.ProjectFileStorageService()) {
        this.repo = repo;
        this.storage = storage;
    }
    async getStorageSummary() {
        return this.repo.findProjectsWithUsage();
    }
    async getProjectFiles(projectId) {
        const project = await client_1.default.project.findFirst({ where: { id: projectId, deletedAt: null } });
        if (!project) {
            throw new Error('Project not found');
        }
        return this.repo.findByProject(projectId);
    }
    async uploadFile(projectId, file, actorId) {
        if (!projectId) {
            throw new Error('A project must be selected before uploading a file');
        }
        if (!file) {
            throw new Error('A file is required');
        }
        const project = await client_1.default.project.findFirst({ where: { id: projectId, deletedAt: null } });
        if (!project) {
            throw new Error('Project not found');
        }
        const uploaded = await this.storage.uploadFile(projectId, file);
        return this.repo.create({
            name: uploaded.fileName,
            fileUrl: uploaded.fileUrl,
            fileType: uploaded.fileType,
            sizeKb: uploaded.sizeKb,
            r2ObjectKey: uploaded.r2ObjectKey,
            projectId,
            uploadedBy: actorId,
        });
    }
    async deleteFile(id) {
        const file = await this.repo.findById(id);
        if (!file) {
            throw new Error('File not found');
        }
        if (file.r2ObjectKey) {
            // Best-effort: if R2 credentials aren't configured yet (or the object
            // is already gone), don't let that block removing the DB record — the
            // admin explicitly asked to delete this file.
            try {
                await this.storage.deleteObject(file.r2ObjectKey);
            }
            catch (err) {
                console.error(`Failed to delete R2 object ${file.r2ObjectKey}:`, err);
            }
        }
        await this.repo.softDelete(id);
    }
    async keepFile(id, actorId) {
        const file = await this.repo.findById(id);
        if (!file) {
            throw new Error('File not found');
        }
        return this.repo.keepForever(id, actorId);
    }
    // Files due for review, annotated with how many days remain before the
    // auto-delete job would remove them — sorted soonest-to-delete first.
    async getReviewList() {
        const files = await this.repo.findNeedingReview();
        const now = Date.now();
        return files.map((f) => ({
            ...f,
            daysUntilDeletion: f.expiresAt
                ? Math.max(0, Math.ceil((new Date(f.expiresAt).getTime() - now) / (24 * 60 * 60 * 1000)))
                : null,
        }));
    }
    async getFileForDownload(id) {
        const file = await this.repo.findById(id);
        if (!file) {
            throw new Error('File not found');
        }
        if (!file.r2ObjectKey) {
            throw new Error('File has no stored object to download');
        }
        return file;
    }
    getStorageService() {
        return this.storage;
    }
    static get reviewWindowDays() {
        return project_files_repository_1.REVIEW_WINDOW_DAYS;
    }
}
exports.ProjectFilesService = ProjectFilesService;
