"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadProjectFile = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// The Files module intentionally accepts *any* file type (images, PDFs,
// DWG/DXF CAD drawings, office docs, archives, etc.) — unlike the task
// completion upload middleware, which whitelists a narrow set of extensions.
// We still block a short list of executable/script extensions since there's
// no legitimate project-deliverable reason to store them, and a generous but
// finite size cap to avoid a single upload exhausting request memory (files
// are buffered in memory before being streamed to R2).
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.msi', '.sh', '.com', '.scr'];
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
    fileFilter: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (BLOCKED_EXTENSIONS.includes(ext)) {
            cb(new Error('This file extension is not allowed'));
            return;
        }
        cb(null, true);
    },
});
const uploadProjectFile = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            const message = err instanceof multer_1.default.MulterError && err.code === 'LIMIT_FILE_SIZE'
                ? `File exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB size limit`
                : err.message;
            res.status(400).json({ success: false, error: message });
            return;
        }
        next();
    });
};
exports.uploadProjectFile = uploadProjectFile;
