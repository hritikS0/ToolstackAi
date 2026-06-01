import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { createMessageService } from "./message.service.js";
import { nvidia } from "../../ai/providers/nvidia.js";
import { chatSystemPrompt } from "../../ai/prompts/prompts.js";
import { logger } from "../../shared/utils/logger.js";
import { handleAIError } from "../../shared/utils/ai-error-handler.js";
import { getMemoriesForContext, autoExtractMemories } from "../brain/brain.service.js";
import { getUserKey, trackUsage } from "../api-keys/api-keys.service.js";

const memoryCache = new Map<string, { context: string; ts: number }>();
const CACHE_TTL = 60_000;

async function getCachedMemoryContext(userId: string): Promise<string> {
  const cached = memoryCache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.context;
  const context = await getMemoriesForContext(userId);
  memoryCache.set(userId, { context, ts: Date.now() });
  return context;
}

async function getUserApiKey(userId: string): Promise<string | null> {
  return getUserKey(userId, "nvidia");
}

async function buildMessages(history: { role: string; content: string }[], userId: string) {
  const memoryContext = await getCachedMemoryContext(userId);
  return [
    { role: "system" as const, content: chatSystemPrompt(memoryContext) },
    ...history.map((m) => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
  ];
}

function buildHistory(history: { role: string; content: string }[]): string {
  return history.map((m) => `[${m.role}]: ${m.content}`).join("\n");
}

export async function generateAiResponse(
  message: string,
  conversationId: string,
  userId: string,
): Promise<{ userMessage: unknown; assistantMessage: unknown }> {
  const prisma = getPrismaClient();

  const userMessage = await createMessageService(message, conversationId, "user");

  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  history.reverse();

  const messages = await buildMessages(history, userId);

  logger.info({ conversationId, history: buildHistory(history) }, "generateAiResponse messages");

  let aiContent = "";
  let tokensUsed = 0;
  let usedUserKey = false;

  try {
    const userKey = await getUserApiKey(userId);
    const completion = await nvidia.chatCompletion(messages, userKey ? { apiKey: userKey } : {});
    aiContent = completion.choices[0]?.message?.content || "";
    tokensUsed = completion.usage?.total_tokens || 0;
    usedUserKey = !!userKey;
    trackUsage({ userId, provider: "nvidia", model: process.env.NVIDIA_CHAT_MODEL || "meta/llama-3.1-8b-instruct", tokens: tokensUsed, cost: 0 }).catch(() => {});
    logger.info({ aiContent: aiContent.slice(0, 500), tokensUsed, usedUserKey }, "generateAiResponse raw response");
  } catch (err) {
    handleAIError(err, "nvidia");
  }

  if (!aiContent) {
    aiContent = "I'm sorry, I couldn't generate a response.";
  }

  const assistantMessage = await createMessageService(aiContent, conversationId, "assistant");

  autoExtractMemories(message, userId).then((saved) => {
    if (saved > 0) memoryCache.delete(userId);
  }).catch(() => {});

  await autoTitleConversation(conversationId, message);

  await logToolExecution({
    conversationId,
    toolName: "chat-completion",
    status: "completed",
    input: { message },
    output: { response: aiContent, tokensUsed },
  });

  return { userMessage, assistantMessage };
}

export async function* streamAiResponse(
  message: string,
  conversationId: string,
  userId: string,
): AsyncGenerator<string, void, unknown> {
  const prisma = getPrismaClient();

  await createMessageService(message, conversationId, "user");

  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  history.reverse();

  const messages = await buildMessages(history, userId);

  logger.info({ conversationId, history: buildHistory(history) }, "streamAiResponse messages");

  let fullContent = "";
  let streamed = false;
  let streamError: unknown = null;
  let usedUserKey = false;

  try {
    const userKey = await getUserApiKey(userId);
    usedUserKey = !!userKey;
    const stream = nvidia.chatCompletionStream(messages, userKey ? { apiKey: userKey } : {});

    for await (const chunk of stream) {
      fullContent += chunk;
      streamed = true;
      yield chunk;
    }
  } catch (err) {
    streamError = err;
    logger.error({ err, conversationId }, "streamAiResponse streaming error, falling back to non-streaming");
  }

  if (!streamed || streamError) {
    try {
      const userKey = await getUserApiKey(userId);
      const completion = await nvidia.chatCompletion(messages, userKey ? { apiKey: userKey } : {});
      fullContent = completion.choices[0]?.message?.content || "";
      logger.info({ fullContent: fullContent.slice(0, 500) }, "streamAiResponse non-streaming fallback");
      yield fullContent;
    } catch (fallbackErr) {
      logger.error({ err: fallbackErr, conversationId }, "streamAiResponse non-streaming fallback also failed");
      fullContent = ""; // yield nothing
    }
  }

  if (!fullContent) {
    fullContent = "I'm sorry, I couldn't generate a response.";
  }

  await createMessageService(fullContent, conversationId, "assistant");

  trackUsage({
    userId,
    provider: "nvidia",
    model: process.env.NVIDIA_CHAT_MODEL || "meta/llama-3.1-8b-instruct",
    tokens: Math.ceil(fullContent.length / 4),
    cost: 0,
  }).catch(() => {});

  autoExtractMemories(message, userId).then((saved) => {
    if (saved > 0) memoryCache.delete(userId);
  }).catch(() => {});

  await autoTitleConversation(conversationId, message);

  await logToolExecution({
    conversationId,
    toolName: "chat-completion-stream",
    status: streamError ? "failed" : "completed",
    input: { message },
    output: { responseLength: fullContent.length },
  });
}

async function autoTitleConversation(conversationId: string, firstMessage: string) {
  const prisma = getPrismaClient();
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv) return;

  if (conv.title && conv.title !== "New Chat") return;

  const title =
    firstMessage.length > 60 ? firstMessage.slice(0, 57) + "..." : firstMessage;

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { title },
  });
}

async function logToolExecution(data: {
  conversationId: string;
  toolName: string;
  status: string;
  input: unknown;
  output: unknown;
}) {
  const prisma = getPrismaClient();
  try {
    await (prisma.toolExecution.create as any)({
      data: {
        conversationId: data.conversationId,
        toolName: data.toolName,
        status: data.status,
        input: data.input,
        output: data.output,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });
  } catch (err) {
    logger.error({ err }, "Failed to load tool execution");
  }
}
