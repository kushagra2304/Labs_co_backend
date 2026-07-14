import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, r2Config } from '../config/r2-storage.config';
import { FileType } from '@prisma/client';
import crypto from 'crypto';
import path from 'path';
import type { Readable } from 'stream';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp'];
const DOC_EXTENSIONS = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'];
const CAD_EXTENSIONS = ['.dwg', '.dxf'];

function resolveFileType(ext: string): FileType {
  const lower = ext.toLowerCase();
  if (IMAGE_EXTENSIONS.includes(lower)) return FileType.image;
  if (lower === '.pdf') return FileType.pdf;
  if (CAD_EXTENSIONS.includes(lower)) return FileType.dwg;
  if (DOC_EXTENSIONS.includes(lower)) return FileType.doc;
  return FileType.other;
}

// Handles all R2 object storage operations for the Files module (project
// deliverables). Kept separate from TaskFileService/MediaService so this
// module's key layout and lifecycle (30-day auto-delete) can evolve
// independently of the task-submission and chat-attachment upload paths.
export class ProjectFileStorageService {
  async uploadFile(projectId: string, file: Express.Multer.File): Promise<{
    fileName: string;
    fileType: FileType;
    fileUrl: string;
    sizeKb: number;
    r2ObjectKey: string;
  }> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uuid = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    const key = `projects/${projectId}/${year}/${month}/${uuid}${ext}`;

    const command = new PutObjectCommand({
      Bucket: r2Config.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);

    return {
      fileName: file.originalname,
      fileType: resolveFileType(ext),
      fileUrl: `${r2Config.publicUrl}/${key}`,
      sizeKb: Math.ceil(file.size / 1024),
      r2ObjectKey: key,
    };
  }

  async deleteObject(r2ObjectKey: string): Promise<void> {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: r2Config.bucketName,
      Key: r2ObjectKey,
    }));
  }

  // Returns a readable stream of the object's bytes — used to pipe a single
  // file into a zip archive for the review-flow "download zip" action.
  async getObjectStream(r2ObjectKey: string): Promise<Readable> {
    const result = await s3Client.send(new GetObjectCommand({
      Bucket: r2Config.bucketName,
      Key: r2ObjectKey,
    }));
    return result.Body as Readable;
  }
}
