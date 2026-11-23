// Cloudflare R2 uploads over the S3 API (free tier: 10 GB, zero egress fees).
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const e = (k) => (process.env[k] ?? '').toString().trim();
let client;
const c = () => (client ??= new S3Client({
  region: 'auto',
  endpoint: `https://${e('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: e('R2_ACCESS_KEY_ID'), secretAccessKey: e('R2_SECRET_ACCESS_KEY') },
}));

export const R2_VARS = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE'];
export const r2Missing = () => R2_VARS.filter((k) => !e(k));
export const publicUrl = (key) => e('R2_PUBLIC_BASE').replace(/\/$/, '') + '/' + key;

export async function put(key, body, contentType, extra = {}) {
  await c().send(new PutObjectCommand({
    Bucket: e('R2_BUCKET'), Key: key, Body: body, ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable', ...extra,
  }));
}
