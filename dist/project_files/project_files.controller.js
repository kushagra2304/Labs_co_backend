"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectFilesController = void 0;
const archiver_1 = __importDefault(require("archiver"));
const project_files_service_1 = require("./project_files.service");
class ProjectFilesController {
    service;
    constructor(service = new project_files_service_1.ProjectFilesService()) {
        this.service = service;
    }
    listStorageSummary = async (_req, res) => {
        try {
            const summary = await this.service.getStorageSummary();
            res.status(200).json({ success: true, data: summary });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message || 'Failed to fetch storage summary' });
        }
    };
    listReview = async (_req, res) => {
        try {
            const files = await this.service.getReviewList();
            res.status(200).json({ success: true, data: files });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message || 'Failed to fetch files awaiting review' });
        }
    };
    listByProject = async (req, res) => {
        try {
            const projectId = String(req.params.projectId);
            const files = await this.service.getProjectFiles(projectId);
            res.status(200).json({ success: true, data: files });
        }
        catch (error) {
            const status = error.message === 'Project not found' ? 404 : 500;
            res.status(status).json({ success: false, error: error.message || 'Failed to fetch project files' });
        }
    };
    uploadFile = async (req, res) => {
        try {
            const actorId = req.user.id;
            const projectId = String(req.body.projectId || '');
            const file = await this.service.uploadFile(projectId, req.file, actorId);
            res.status(201).json({ success: true, data: file });
        }
        catch (error) {
            const status = error.message === 'Project not found' ? 404 : 400;
            res.status(status).json({ success: false, error: error.message || 'Failed to upload file' });
        }
    };
    deleteFile = async (req, res) => {
        try {
            const id = String(req.params.id);
            await this.service.deleteFile(id);
            res.status(200).json({ success: true, message: 'File deleted' });
        }
        catch (error) {
            const status = error.message === 'File not found' ? 404 : 500;
            res.status(status).json({ success: false, error: error.message || 'Failed to delete file' });
        }
    };
    keepFile = async (req, res) => {
        try {
            const id = String(req.params.id);
            const actorId = req.user.id;
            const file = await this.service.keepFile(id, actorId);
            res.status(200).json({ success: true, data: file });
        }
        catch (error) {
            const status = error.message === 'File not found' ? 404 : 500;
            res.status(status).json({ success: false, error: error.message || 'Failed to keep file' });
        }
    };
    downloadZip = async (req, res) => {
        try {
            const id = String(req.params.id);
            const file = await this.service.getFileForDownload(id);
            const storage = this.service.getStorageService();
            const stream = await storage.getObjectStream(file.r2ObjectKey);
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}.zip"`);
            const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
            archive.on('error', (err) => {
                console.error('Zip archive error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ success: false, error: 'Failed to build zip archive' });
                }
            });
            archive.pipe(res);
            archive.append(stream, { name: file.name });
            await archive.finalize();
        }
        catch (error) {
            const status = error.message === 'File not found' ? 404 : 500;
            if (!res.headersSent) {
                res.status(status).json({ success: false, error: error.message || 'Failed to download file' });
            }
        }
    };
}
exports.ProjectFilesController = ProjectFilesController;
