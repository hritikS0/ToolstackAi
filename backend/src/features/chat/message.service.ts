import { getPrismaClient } from "../../shared/db/prismaClient.js";

export async function createMessageService(
  message: string,
  conversationId: string,
  role: string = "user",
) {
  const prisma = getPrismaClient();
  if (!message || !conversationId) {
    throw Object.assign(new Error("Message and Conversation ID are required"), {
      statusCode: 400,
    });
  }
  const messages = await prisma.message.create({
    data: {
      content: message,
      conversationId: conversationId,
      role: role,
    },
  });
  return messages;
}
export async function getMessageService(conversationId: string) {
    const prisma = getPrismaClient();
    return await prisma.message.findMany({
      where: {
        conversationId
      },
      orderBy: {
        createdAt: "asc"
      }
    });
}
