"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskFileService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const r2_storage_config_1 = require("../config/r2-storage.config");
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const DOC_EXTENSIONS = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
const CAD_EXTENSIONS = ['.dwg', '.dxf'];
function resolveFileType(ext) {
    const lower = ext.toLowerCase();
    if (IMAGE_EXTENSIONS.includes(lower))
        return client_1.FileType.image;
    if (lower === '.pdf')
        return client_1.FileType.pdf;
    if (CAD_EXTENSIONS.includes(lower))
        return client_1.FileType.dwg;
    if (DOC_EXTENSIONS.includes(lower))
        return client_1.FileType.doc;
    return client_1.FileType.other;
}
// Uploads a task completion attachment (image / pdf / dwg / office doc) to R2
// storage. Mirrors the chat module's MediaService but scoped to the tasks
// module so the two upload paths can evolve independently.
class TaskFileService {
    async uploadCompletionFile(file) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const uuid = crypto_1.default.randomUUID();
        const ext = path_1.default.extname(file.originalname);
        const key = `tasks/${year}/${month}/${uuid}${ext}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: r2_storage_config_1.r2Config.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });
        await r2_storage_config_1.s3Client.send(command);
        const fileUrl = `${r2_storage_config_1.r2Config.publicUrl}/${key}`;
        return {
            fileName: file.originalname,
            fileType: resolveFileType(ext),
            fileUrl,
            sizeKb: Math.ceil(file.size / 1024),
        };
    }
}
exports.TaskFileService = TaskFileService;
