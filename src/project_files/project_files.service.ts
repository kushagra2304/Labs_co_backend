import prisma from '../prisma/client';
import { ProjectFilesRepository, REVIEW_WINDOW_DAYS } from './project_files.repository';
import { ProjectFileStorageService } from './project-file-storage.service';
import { File } from '@prisma/client';

export class ProjectFilesService {
  constructor(
    private repo = new ProjectFilesRepository(),
    private storage = new ProjectFileStorageService()
  ) {}

  async getStorageSummary() {
    return this.repo.findProjectsWithUsage();
  }

  async getProjectFiles(projectId: string) {
    const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) {
      throw new Error('Project not found');
    }
    return this.repo.findByProject(projectId);
  }

  async uploadFile(projectId: string, file: Express.Multer.File | undefined, actorId: string): Promise<File> {
    if (!projectId) {
      throw new Error('A project must be selected before uploading a file');
    }
    if (!file) {
      throw new Error('A file is required');
    }

    const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
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

  async deleteFile(id: string): Promise<void> {
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
      } catch (err) {
        console.error(`Failed to delete R2 object ${file.r2ObjectKey}:`, err);
      }
    }

    await this.repo.softDelete(id);
  }

  async keepFile(id: string, actorId: string): Promise<File> {
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

  async getFileForDownload(id: string): Promise<File & { project: { id: string; name: string } | null }> {
    const file = await this.repo.findById(id);
    if (!file) {
      throw new Error('File not found');
    }
    if (!file.r2ObjectKey) {
      throw new Error('File has no stored object to download');
    }
    return file as any;
  }

  getStorageService() {
    return this.storage;
  }

  static get reviewWindowDays() {
    return REVIEW_WINDOW_DAYS;
  }
}
