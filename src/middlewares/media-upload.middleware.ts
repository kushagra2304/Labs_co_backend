import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';

const LIMITS = {
  IMAGE: { extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'], size: 10 * 1024 * 1024 },
  VIDEO: { extensions: ['.mp4', '.mov', '.webm'], size: 100 * 1024 * 1024 },
  AUDIO: { extensions: ['.mp3', '.wav', '.ogg'], size: 20 * 1024 * 1024 },
  DOC: { extensions: ['.pdf', '.docx', '.xlsx', '.pptx'], size: 25 * 1024 * 1024 },
};

const BLOCKED_EXTENSIONS = ['.exe', '.sh', '.bat', '.zip', '.tar'];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (BLOCKED_EXTENSIONS.includes(ext)) {
      cb(new Error('File extension is blocked'));
      return;
    }

    const isAllowed = Object.values(LIMITS).some((cat) => cat.extensions.includes(ext));
    if (!isAllowed) {
      cb(new Error('Unsupported file extension'));
      return;
    }

    cb(null, true);
  },
});

export const uploadChatMedia = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileSize = req.file.size;

    let categoryLimit = 0;
    let categoryName = '';

    for (const [key, cat] of Object.entries(LIMITS)) {
      if (cat.extensions.includes(ext)) {
        categoryLimit = cat.size;
        categoryName = key;
        break;
      }
    }

    if (fileSize > categoryLimit) {
      res.status(400).json({
        success: false,
        error: `File size exceeds the limit of ${categoryLimit / (1024 * 1024)}MB for ${categoryName.toLowerCase()}s`,
      });
      return;
    }

    next();
  });
};
