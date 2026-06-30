"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const r2_storage_config_1 = require("../config/r2-storage.config");
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
class MediaService {
    async uploadFile(file) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const uuid = crypto_1.default.randomUUID();
        const ext = path_1.default.extname(file.originalname);
        const key = `chat/${year}/${month}/${uuid}${ext}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: r2_storage_config_1.r2Config.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });
        await r2_storage_config_1.s3Client.send(command);
        const cdnUrl = `${r2_storage_config_1.r2Config.publicUrl}/${key}`;
        return {
            fileName: file.originalname,
            fileType: file.mimetype,
            fileSizeBytes: BigInt(file.size),
            r2ObjectKey: key,
            cdnUrl,
        };
    }
    async deleteFile(r2ObjectKey) {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: r2_storage_config_1.r2Config.bucketName,
            Key: r2ObjectKey,
        });
        await r2_storage_config_1.s3Client.send(command);
    }
}
exports.MediaService = MediaService;
