import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { uploadFile, deleteFile, getSignedUrl } from "../../services/storage.service.js";
import { StorageError } from "../../services/storage.errors.js";

export async function uploadAndSave(
  file: Express.Multer.File,
  userId: string,
  bucket: string,
  fileType: string,
) {
  const result = await uploadFile(
    { buffer: file.buffer, mimetype: file.mimetype, size: file.size, originalname: file.originalname },
    userId,
    bucket,
  );

  const prisma = getPrismaClient();
  return prisma.storedFile.create({
    data: {
      userId,
      name: file.originalname,
      type: fileType,
      bucket,
      storagePath: result.fullPath,
      size: file.size,
      mimeType: file.mimetype,
    },
  });
}

export async function getFiles(userId: string, type?: string) {
  const prisma = getPrismaClient();
  const where: Record<string, unknown> = { userId };
  if (type) where.type = type;
  return prisma.storedFile.findMany({ where, orderBy: { createdAt: "desc" } });
}

export async function getFileById(id: string, userId: string) {
  const prisma = getPrismaClient();
  const file = await prisma.storedFile.findUnique({ where: { id } });
  if (!file || file.userId !== userId) throw StorageError.notFound(id);

  const url = await getSignedUrl(file.storagePath, file.bucket);
  return { ...file, signedUrl: url };
}

export async function deleteStoredFile(id: string, userId: string) {
  const prisma = getPrismaClient();
  const file = await prisma.storedFile.findUnique({ where: { id } });
  if (!file || file.userId !== userId) throw StorageError.notFound(id);

  await deleteFile(file.storagePath, file.bucket);
  await prisma.storedFile.delete({ where: { id } });
}
