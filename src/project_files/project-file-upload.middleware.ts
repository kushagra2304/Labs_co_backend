import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';

// The Files module intentionally accepts *any* file type (images, PDFs,
// DWG/DXF CAD drawings, office docs, archives, etc.) — unlike the task
// completion upload middleware, which whitelists a narrow set of extensions.
// We still block a short list of executable/script extensions since there's
// no legitimate project-deliverable reason to store them, and a generous but
// finite size cap to avoid a single upload exhausting request memory (files
// are buffered in memory before being streamed to R2).
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.msi', '.sh', '.com', '.scr'];
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      cb(new Error('This file extension is not allowed'));
      return;
    }
    cb(null, true);
  },
});

export const uploadProjectFile = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
        ? `File exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB size limit`
        : err.message;
      res.status(400).json({ success: false, error: message });
      return;
    }
    next();
  });
};
