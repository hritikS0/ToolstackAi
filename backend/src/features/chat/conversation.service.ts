import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { deleteMediaByConversation } from "../media/media.service.js";
import { deletePdfFromStorage } from "../pdf/pdf.service.js";

export async function conversationService(title: string, userId: string) {
  const prisma = getPrismaClient();

  const conversation = await prisma.conversation.create({
    data: {
      title: title || "New Chat",
      userId,
    },
  });
  return {
    conversation: {
      id: conversation.id,
      title: conversation.title,
      userId: conversation.userId,
      settings: conversation.settings,
    },
  };
}
export async function getConversations(userId: string) {
  const prisma = getPrismaClient();
  const conversation = await prisma.conversation.findMany({
    where: {
      userId,
    },
  });
  return conversation;
}

export async function deleteConversation(conversationId: string, userId: string) {
  const prisma = getPrismaClient();
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv || conv.userId !== userId) {
    throw Object.assign(new Error("Conversation not found"), { statusCode: 404 });
  }
  await prisma.message.deleteMany({ where: { conversationId } });
  await prisma.conversation.delete({ where: { id: conversationId } });

  deleteMediaByConversation(conversationId).catch(() => { });
  deletePdfFromStorage(conversationId).catch(() => { });
}

export async function updateConversation(conversationId: string, userId: string, data: { title?: string; settings?: any }) {
  const prisma = getPrismaClient();
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv || conv.userId !== userId) {
    throw Object.assign(new Error("Conversation not found"), { statusCode: 404 });
  }
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      title: data.title, settings: data.settings !== undefined ? data.settings : undefined
    },
  });
}
