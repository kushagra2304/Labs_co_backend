import { Request, Response } from 'express';
import { MediaService } from '../services/media.service';

export class MediaController {
  constructor(private mediaService = new MediaService()) {}

  uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      const result = await this.mediaService.uploadFile(req.file);

      res.status(200).json({
        success: true,
        data: {
          fileName: result.fileName,
          fileType: result.fileType,
          fileSizeBytes: result.fileSizeBytes.toString(), // Convert BigInt to string for JSON serialization
          r2ObjectKey: result.r2ObjectKey,
          cdnUrl: result.cdnUrl,
        },
      });
    } catch (error: any) {
      console.error('File upload controller error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload media file',
      });
    }
  };
}
