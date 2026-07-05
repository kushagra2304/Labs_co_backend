"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaController = void 0;
const media_service_1 = require("../services/media.service");
class MediaController {
    mediaService;
    constructor(mediaService = new media_service_1.MediaService()) {
        this.mediaService = mediaService;
    }
    uploadFile = async (req, res) => {
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
        }
        catch (error) {
            console.error('File upload controller error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to upload media file',
            });
        }
    };
}
exports.MediaController = MediaController;
