"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadTaskCompletionFile = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// File types an employee may attach when submitting a task for completion
// review: images, PDFs, CAD drawings, and common office document formats.
const LIMITS = {
    IMAGE: { extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'], size: 15 * 1024 * 1024 },
    PDF: { extensions: ['.pdf'], size: 25 * 1024 * 1024 },
    CAD: { extensions: ['.dwg', '.dxf'], size: 50 * 1024 * 1024 },
    DOC: { extensions: ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'], size: 25 * 1024 * 1024 },
};
const BLOCKED_EXTENSIONS = ['.exe', '.sh', '.bat', '.zip', '.tar', '.msi'];
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (BLOCKED_EXTENSIONS.includes(ext)) {
            cb(new Error('File extension is blocked'));
            return;
        }
        const isAllowed = Object.values(LIMITS).some((cat) => cat.extensions.includes(ext));
        if (!isAllowed) {
            cb(new Error('Unsupported file type. Allowed: images, PDF, DWG/DXF, DOC/DOCX, XLS/XLSX, PPT/PPTX'));
            return;
        }
        cb(null, true);
    },
});
const uploadTaskCompletionFile = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            res.status(400).json({ success: false, error: err.message });
            return;
        }
        if (!req.file) {
            // No file on this request is fine for some routes (e.g. review), but
            // the submit-completion controller itself enforces the requirement.
            next();
            return;
        }
        const ext = path_1.default.extname(req.file.originalname).toLowerCase();
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
                error: `File size exceeds the limit of ${categoryLimit / (1024 * 1024)}MB for ${categoryName.toLowerCase()} files`,
            });
            return;
        }
        next();
    });
};
exports.uploadTaskCompletionFile = uploadTaskCompletionFile;
