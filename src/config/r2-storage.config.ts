import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const accountId = process.env.R2_ACCOUNT_ID || '';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
const bucketName = process.env.R2_BUCKET_NAME || '';
const publicUrl = process.env.R2_PUBLIC_URL || '';

export const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const r2Config = {
  bucketName,
  publicUrl: publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl,
};
