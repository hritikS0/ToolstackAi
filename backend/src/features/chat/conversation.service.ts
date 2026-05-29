import { getPrismaClient } from "../../shared/db/prismaClient.js";

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
