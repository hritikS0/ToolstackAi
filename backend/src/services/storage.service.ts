import fs from "node:fs/promises";
import path from "node:path";
import { supabase } from "../config/supabase.js";
import { validateFileUpload, StorageError } from "./storage.errors.js";
import { logger } from "../shared/utils/logger.js";

const BUCKETS = ["pdfs", "images", "avatars", "exports"] as const;

async function getExistingBuckets(): Promise<string[]> {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    logger.error({ error }, "Failed to list Supabase buckets");
    return [];
  }
  return data.map((b: { name: string }) => b.name);
}

export async function ensureBucket(bucket: string): Promise<void> {
  try {
    const existing = await getExistingBuckets();
    if (!existing.includes(bucket)) {
      const { error } = await supabase.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: 10 * 1024 * 1024,
      });
      if (error) {
        logger.error({ error, bucket }, "Failed to create bucket");
      } else {
        logger.info(`Bucket created: ${bucket}`);
      }
    }
  } catch (err) {
    logger.error({ err, bucket }, "ensureBucket failed");
  }
}

async function ensureAllBuckets() {
  for (const name of BUCKETS) {
    await ensureBucket(name);
  }
}

ensureAllBuckets();

function buildPath(userId: string, bucket: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${bucket}/${userId}/${Date.now()}_${safe}`;
}

export async function uploadFile(
  file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
  userId: string,
  bucket: string,
) {
  validateFileUpload({ mimetype: file.mimetype, size: file.size }, bucket);

  await ensureBucket(bucket);

  const storagePath = buildPath(userId, bucket, file.originalname);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error || !data) {
    logger.error({ error: error?.message, errorName: error?.name, userId, bucket, fileName: file.originalname }, "Supabase upload failed");
    throw StorageError.uploadFailed(error?.message || "Unknown upload error");
  }

  logger.info({ path: data.path, bucket }, "File uploaded to Supabase");
  return { path: data.path, fullPath: storagePath };
}

export async function uploadFileFromDisk(
  localPath: string,
  originalname: string,
  mimetype: string,
  userId: string,
  bucket: string,
) {
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(localPath);
  } catch (err) {
    logger.error({ err, localPath }, "Failed to read temp file");
    throw StorageError.uploadFailed("Temp file not found");
  }

  const stat = await fs.stat(localPath);

  try {
    return await uploadFile({ buffer, mimetype, size: stat.size, originalname }, userId, bucket);
  } finally {
    await fs.unlink(localPath).catch(() => {});
  }
}

export async function deleteFile(storagePath: string, bucket: string) {
  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) {
    logger.error({ error, storagePath, bucket }, "Supabase delete failed");
    return false;
  }
  return true;
}

export async function getSignedUrl(storagePath: string, bucket: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data) {
    logger.error({ error: error?.message, storagePath, bucket }, "Supabase signed URL failed");
    throw StorageError.notFound(storagePath);
  }
  return data.signedUrl;
}
