import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { createMessageService } from "./message.service.js";
import { nvidia } from "../../ai/providers/nvidia.js";
import { chatSystemPrompt } from "../../ai/prompts/prompts.js";
import { logger } from "../../shared/utils/logger.js";
import { handleAIError } from "../../shared/utils/ai-error-handler.js";
import { getMemoriesForContext, autoExtractMemories } from "../brain/brain.service.js";
import { getUserKey, trackUsage } from "../api-keys/api-keys.service.js";
import { parseToolCalls, executeToolCall, replaceToolCalls } from "./tool-executor.js";

const memoryCache = new Map<string, { context: string; ts: number }>();
const workspaceCache = new Map<string, { context: string; ts: number }>();
const CACHE_TTL = 60_000;

async function getCachedMemoryContext(userId: string): Promise<string> {
  const cached = memoryCache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.context;
  const context = await getMemoriesForContext(userId);
  memoryCache.set(userId, { context, ts: Date.now() });
  return context;
}

async function getWorkspaceContext(userId: string): Promise<string> {
  const cached = workspaceCache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.context;
  const prisma = getPrismaClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [tasks, habits, goals] = await Promise.all([
    prisma.task.findMany({ where: { userId, status: { not: 'archived' } }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.habit.findMany({ where: { userId, active: true }, orderBy: { createdAt: 'desc' } }),
    prisma.goal.findMany({ where: { userId, status: 'active' }, orderBy: { createdAt: 'desc' }, include: { milestones: true } }),
  ]);

  const parts: string[] = [];

  if (tasks.length > 0) {
    parts.push('## Tasks\n' + tasks.map(t =>
      `- [${t.status}] ${t.title}${t.priority !== 'medium' ? ` (${t.priority})` : ''}${t.dueDate ? ` due ${new Date(t.dueDate).toLocaleDateString()}` : ''}`
    ).join('\n'));
  }

  if (habits.length > 0) {
    parts.push('## Habits\n' + habits.map(h =>
      `- ${h.title} (${h.frequency})`
    ).join('\n'));
  }

  if (goals.length > 0) {
    parts.push('## Goals\n' + goals.map(g =>
      `- ${g.title} — ${g.milestones.filter(m => m.status === 'completed').length}/${g.milestones.length} milestones, progress ${g.progress}%${g.targetDate ? `, target ${new Date(g.targetDate).toLocaleDateString()}` : ''}`
    ).join('\n'));
  }

  const context = parts.length > 0 ? '\n\n=== USER WORKSPACE ===\nThe user has the following items in their workspace. Use this to answer questions about their tasks, habits, and goals. You can create new tasks/habits when asked.\n\n' + parts.join('\n\n') + '\n=== END WORKSPACE ===' : '';

  workspaceCache.set(userId, { context, ts: Date.now() });
  return context;
}

async function getUserApiKey(userId: string): Promise<string | null> {
  return getUserKey(userId, "nvidia");
}

async function buildMessages(history: { role: string; content: string }[], userId: string) {
  const memoryContext = await getCachedMemoryContext(userId);
  const workspaceContext = await getWorkspaceContext(userId);
  return [
    { role: "system" as const, content: chatSystemPrompt(memoryContext, workspaceContext) },
    ...history.map((m) => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
  ];
}

function buildHistory(history: { role: string; content: string }[]): string {
  return history.map((m) => `[${m.role}]: ${m.content}`).join("\n");
}

async function processToolCalls(responseText: string, userId: string): Promise<{ cleanText: string; toolResults: string }> {
  const toolCalls = parseToolCalls(responseText);
  if (toolCalls.length === 0) return { cleanText: responseText, toolResults: '' };

  const replacements: { placeholder: string; result: string }[] = [];
  const results: string[] = [];

  for (const tc of toolCalls) {
    const toolResult = await executeToolCall(tc.name, tc.params, userId);
    const placeholder = responseText.slice(tc.start, tc.end);
    const resultText = `[${toolResult.success ? '✓' : '✗'}] ${toolResult.message}`;
    replacements.push({ placeholder, result: resultText });
    results.push(resultText);
  }

  const cleanText = replaceToolCalls(responseText, replacements);
  workspaceCache.delete(userId);
  return { cleanText, toolResults: results.join('\n') };
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
    aiContent = aiContent.replace(/\[SYSTEM ACTION\][\s\S]*?\[END SYSTEM ACTION\]\s*/gi, '').trim();

    const { cleanText } = await processToolCalls(aiContent, userId);
    if (cleanText !== aiContent) {
      aiContent = cleanText;
    }

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

  const extractPromise = autoExtractMemories(message, userId).catch(() => 0);

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

  fullContent = fullContent.replace(/\[SYSTEM ACTION\][\s\S]*?\[END SYSTEM ACTION\]\s*/gi, '').trim();

  const { cleanText } = await processToolCalls(fullContent, userId);
  if (cleanText !== fullContent) {
    fullContent = cleanText;
    yield `\n\n${cleanText.slice(fullContent.lastIndexOf('\n') + 1)}`;
  }

  await createMessageService(fullContent, conversationId, "assistant");

  trackUsage({
    userId,
    provider: "nvidia",
    model: process.env.NVIDIA_CHAT_MODEL || "meta/llama-3.1-8b-instruct",
    tokens: Math.ceil(fullContent.length / 4),
    cost: 0,
  }).catch(() => {});

  const saved = await extractPromise;
  if (saved > 0) {
    memoryCache.delete(userId);
    yield `__brain__:${saved}`;
  }

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
