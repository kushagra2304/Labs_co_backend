import { Request, Response } from 'express';
import archiver from 'archiver';
import { ProjectFilesService } from './project_files.service';

export class ProjectFilesController {
  constructor(private service = new ProjectFilesService()) {}

  listStorageSummary = async (_req: Request, res: Response): Promise<void> => {
    try {
      const summary = await this.service.getStorageSummary();
      res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch storage summary' });
    }
  };

  listReview = async (_req: Request, res: Response): Promise<void> => {
    try {
      const files = await this.service.getReviewList();
      res.status(200).json({ success: true, data: files });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch files awaiting review' });
    }
  };

  listByProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const projectId = String(req.params.projectId);
      const files = await this.service.getProjectFiles(projectId);
      res.status(200).json({ success: true, data: files });
    } catch (error: any) {
      const status = error.message === 'Project not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message || 'Failed to fetch project files' });
    }
  };

  uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const actorId = req.user!.id;
      const projectId = String(req.body.projectId || '');
      const file = await this.service.uploadFile(projectId, req.file, actorId);
      res.status(201).json({ success: true, data: file });
    } catch (error: any) {
      const status = error.message === 'Project not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message || 'Failed to upload file' });
    }
  };

  deleteFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      await this.service.deleteFile(id);
      res.status(200).json({ success: true, message: 'File deleted' });
    } catch (error: any) {
      const status = error.message === 'File not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message || 'Failed to delete file' });
    }
  };

  keepFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const actorId = req.user!.id;
      const file = await this.service.keepFile(id, actorId);
      res.status(200).json({ success: true, data: file });
    } catch (error: any) {
      const status = error.message === 'File not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message || 'Failed to keep file' });
    }
  };

  downloadZip = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const file = await this.service.getFileForDownload(id);
      const storage = this.service.getStorageService();
      const stream = await storage.getObjectStream(file.r2ObjectKey as string);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}.zip"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (err) => {
        console.error('Zip archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: 'Failed to build zip archive' });
        }
      });

      archive.pipe(res);
      archive.append(stream, { name: file.name });
      await archive.finalize();
    } catch (error: any) {
      const status = error.message === 'File not found' ? 404 : 500;
      if (!res.headersSent) {
        res.status(status).json({ success: false, error: error.message || 'Failed to download file' });
      }
    }
  };
}
