import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, r2Config } from '../../config/r2-storage.config';
import crypto from 'crypto';
import path from 'path';

export class MediaService {
  async uploadFile(file: Express.Multer.File): Promise<{
    fileName: string;
    fileType: string;
    fileSizeBytes: bigint;
    r2ObjectKey: string;
    cdnUrl: string;
  }> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uuid = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    const key = `chat/${year}/${month}/${uuid}${ext}`;

    const command = new PutObjectCommand({
      Bucket: r2Config.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);

    const cdnUrl = `${r2Config.publicUrl}/${key}`;

    return {
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSizeBytes: BigInt(file.size),
      r2ObjectKey: key,
      cdnUrl,
    };
  }

  async deleteFile(r2ObjectKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: r2Config.bucketName,
      Key: r2ObjectKey,
    });

    await s3Client.send(command);
  }
}
