import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { getSignedUrl } from "../../services/storage.service.js";

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
    const messages = await prisma.message.findMany({
      where: {
        conversationId
      },
      orderBy: {
        createdAt: "asc"
      },
      include: {
        chatMedia: true,
      },
    });

    return await Promise.all(
      messages.map(async (msg) => {
        if (msg.chatMedia?.filePath) {
          const url = await getSignedUrl(msg.chatMedia.filePath, "images").catch(() => null);
          return {
            ...msg,
            chatMedia: { id: msg.chatMedia.id, fileName: msg.chatMedia.fileName, mimeType: msg.chatMedia.mimeType, filePath: msg.chatMedia.filePath, url },
          };
        }
        return msg;
      }),
    );
}
