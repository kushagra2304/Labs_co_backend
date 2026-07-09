import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, r2Config } from '../config/r2-storage.config';
import { FileType } from '@prisma/client';
import crypto from 'crypto';
import path from 'path';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const DOC_EXTENSIONS = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
const CAD_EXTENSIONS = ['.dwg', '.dxf'];

function resolveFileType(ext: string): FileType {
  const lower = ext.toLowerCase();
  if (IMAGE_EXTENSIONS.includes(lower)) return FileType.image;
  if (lower === '.pdf') return FileType.pdf;
  if (CAD_EXTENSIONS.includes(lower)) return FileType.dwg;
  if (DOC_EXTENSIONS.includes(lower)) return FileType.doc;
  return FileType.other;
}

// Uploads a task completion attachment (image / pdf / dwg / office doc) to R2
// storage. Mirrors the chat module's MediaService but scoped to the tasks
// module so the two upload paths can evolve independently.
export class TaskFileService {
  async uploadCompletionFile(file: Express.Multer.File): Promise<{
    fileName: string;
    fileType: FileType;
    fileUrl: string;
    sizeKb: number;
  }> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uuid = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    const key = `tasks/${year}/${month}/${uuid}${ext}`;

    const command = new PutObjectCommand({
      Bucket: r2Config.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);

    const fileUrl = `${r2Config.publicUrl}/${key}`;

    return {
      fileName: file.originalname,
      fileType: resolveFileType(ext),
      fileUrl,
      sizeKb: Math.ceil(file.size / 1024),
    };
  }
}
