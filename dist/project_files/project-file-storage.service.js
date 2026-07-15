"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectFileStorageService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const r2_storage_config_1 = require("../config/r2-storage.config");
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp'];
const DOC_EXTENSIONS = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'];
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
// Handles all R2 object storage operations for the Files module (project
// deliverables). Kept separate from TaskFileService/MediaService so this
// module's key layout and lifecycle (30-day auto-delete) can evolve
// independently of the task-submission and chat-attachment upload paths.
class ProjectFileStorageService {
    async uploadFile(projectId, file) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const uuid = crypto_1.default.randomUUID();
        const ext = path_1.default.extname(file.originalname);
        const key = `projects/${projectId}/${year}/${month}/${uuid}${ext}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: r2_storage_config_1.r2Config.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });
        await r2_storage_config_1.s3Client.send(command);
        return {
            fileName: file.originalname,
            fileType: resolveFileType(ext),
            fileUrl: `${r2_storage_config_1.r2Config.publicUrl}/${key}`,
            sizeKb: Math.ceil(file.size / 1024),
            r2ObjectKey: key,
        };
    }
    async deleteObject(r2ObjectKey) {
        await r2_storage_config_1.s3Client.send(new client_s3_1.DeleteObjectCommand({
            Bucket: r2_storage_config_1.r2Config.bucketName,
            Key: r2ObjectKey,
        }));
    }
    // Returns a readable stream of the object's bytes — used to pipe a single
    // file into a zip archive for the review-flow "download zip" action.
    async getObjectStream(r2ObjectKey) {
        const result = await r2_storage_config_1.s3Client.send(new client_s3_1.GetObjectCommand({
            Bucket: r2_storage_config_1.r2Config.bucketName,
            Key: r2ObjectKey,
        }));
        return result.Body;
    }
}
exports.ProjectFileStorageService = ProjectFileStorageService;
