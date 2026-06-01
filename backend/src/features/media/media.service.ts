import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { uploadFileFromDisk, deleteFile, getSignedUrl } from "../../services/storage.service.js";
import { logger } from "../../shared/utils/logger.js";

export async function getMedia(userId: string) {
  const prisma = getPrismaClient();
  const [chatMedia, storedFiles] = await Promise.all([
    prisma.chatMedia.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.storedFile.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const images = await Promise.all(
    chatMedia.map(async (m) => ({
      id: m.id,
      name: m.fileName,
      type: m.mediaType === "analyzed" ? "image" : "image",
      fileType: "image" as const,
      conversationId: m.conversationId,
      mimeType: m.mimeType,
      createdAt: m.createdAt,
      url: m.filePath ? await getSignedUrl(m.filePath, "images").catch(() => null) : null,
      source: "chat" as const,
    })),
  );

  const pdfs = await Promise.all(
    storedFiles.filter((f) => f.bucket === "pdfs").map(async (f) => ({
      id: f.id,
      name: f.name,
      type: "pdf",
      fileType: "pdf" as const,
      conversationId: null as string | null,
      mimeType: f.mimeType,
      createdAt: f.createdAt,
      url: await getSignedUrl(f.storagePath, f.bucket).catch(() => null),
      source: "upload" as const,
    })),
  );

  return [...images, ...pdfs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function saveMedia(
  tempPath: string,
  fileName: string,
  mimeType: string,
  conversationId: string | null,
  userId: string,
  mediaType: string = "image",
) {
  const prisma = getPrismaClient();

  const upload = await uploadFileFromDisk(tempPath, fileName, mimeType, userId, "images");

  const media = await prisma.chatMedia.create({
    data: {
      conversationId,
      userId,
      fileName,
      mimeType,
      filePath: upload.fullPath,
      mediaType,
    },
  });

  return media;
}

export async function deleteMedia(id: string, userId: string) {
  const prisma = getPrismaClient();
  const media = await prisma.chatMedia.findUnique({ where: { id } });
  if (!media || media.userId !== userId) {
    throw Object.assign(new Error("Media not found"), { statusCode: 404 });
  }

  if (media.filePath) {
    await deleteFile(media.filePath, "images").catch(() => {});
  }

  await prisma.chatMedia.delete({ where: { id } });
}

export async function deleteMediaByConversation(conversationId: string) {
  const prisma = getPrismaClient();
  const media = await prisma.chatMedia.findMany({ where: { conversationId } });
  for (const m of media) {
    if (m.filePath) {
      await deleteFile(m.filePath, "images").catch(() => {});
    }
  }
  await prisma.chatMedia.deleteMany({ where: { conversationId } });
}

export async function getMediaSignedUrl(id: string, userId: string): Promise<string | null> {
  const prisma = getPrismaClient();
  const media = await prisma.chatMedia.findUnique({ where: { id } });
  if (!media || media.userId !== userId || !media.filePath) return null;
  return getSignedUrl(media.filePath, "images");
}
