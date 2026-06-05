import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { createMessageService } from "./message.service.js";
import { nvidia } from "../../ai/providers/nvidia.js";
import { chatSystemPrompt } from "../../ai/prompts/prompts.js";
import { logger } from "../../shared/utils/logger.js";
import { handleAIError } from "../../shared/utils/ai-error-handler.js";
import { getMemoriesForContext, autoExtractMemories } from "../brain/brain.service.js";
import { getUserKey, trackUsage } from "../api-keys/api-keys.service.js";
import { parseToolCalls, executeToolCall, replaceToolCalls } from "./tool-executor.js";
import { WebSearchService } from "../../tools/web-search/web-search.service.js";
const webSearch = new WebSearchService();
const memoryCache = new Map<string, { context: string; ts: number }>();
const workspaceCache = new Map<string, { context: string; ts: number }>();
const conversationsCache = new Map<string, { context: string; ts: number }>();
const CACHE_TTL = 60_000;

async function getCachedMemoryContext(userId: string): Promise<string> {
  const cached = memoryCache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.context;
  const context = await getMemoriesForContext(userId);
  memoryCache.set(userId, { context, ts: Date.now() });
  return context;
}

async function getRecentConversationsContext(userId: string, currentConversationId?: string): Promise<string> {
  const prisma = getPrismaClient();
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        id: currentConversationId ? { not: currentConversationId } : undefined,
        AND: [
          { title: { not: null } },
          { title: { not: "New Chat" } }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        title: true,
        createdAt: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            role: true,
            content: true
          }
        }
      }
    });

    if (conversations.length === 0) return "";

    const parts = conversations.map(c => {
      const msgList = [...c.messages]
        .reverse()
        .map(m => `  - [${m.role}]: ${m.content.slice(0, 150)}${m.content.length > 150 ? "..." : ""}`)
        .join("\n");
      return `### Conversation: "${c.title}" (created ${c.createdAt.toLocaleDateString()})\nRecent exchange:\n${msgList}`;
    });

    return `\n\n=== USER RECENT CONVERSATIONS ===\n${parts.join("\n\n")}\n=== END RECENT CONVERSATIONS ===`;
  } catch (err) {
    logger.error({ err, userId }, "Failed to load recent conversations context");
    return "";
  }
}

async function getCachedConversationsContext(userId: string, currentConversationId?: string): Promise<string> {
  const cached = conversationsCache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.context;
  const context = await getRecentConversationsContext(userId, currentConversationId);
  conversationsCache.set(userId, { context, ts: Date.now() });
  return context;
}

async function getWorkspaceContext(userId: string): Promise<string> {
  const cached = workspaceCache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.context;
  const prisma = getPrismaClient();
  const now = new Date();

  const [projects, tasks, habits, goals] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      include: {
        tasks: { where: { status: { not: 'archived' } } },
        habits: { where: { active: true } },
        goals: { where: { status: 'active' }, include: { milestones: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.task.findMany({ where: { userId, projectId: null, status: { not: 'archived' } }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.habit.findMany({ where: { userId, projectId: null, active: true }, orderBy: { createdAt: 'desc' } }),
    prisma.goal.findMany({ where: { userId, projectId: null, status: 'active' }, orderBy: { createdAt: 'desc' }, include: { milestones: true } }),
  ]);

  const parts: string[] = [];

  const isOpen = (t: any) => t.status !== 'done' && t.status !== 'archived';
  const isOverdue = (t: any) => isOpen(t) && t.dueDate && new Date(t.dueDate) < now;

  if (projects.length > 0) {
    parts.push('## Projects\n' + projects.map(p => {
      let pStr = `### Project: ${p.name}\nDescription: ${p.description || "No description"}`;
      
      const pTasks = p.tasks;
      if (pTasks.length > 0) {
        const overdue = pTasks.filter(isOverdue);
        const open = pTasks.filter(t => isOpen(t) && !isOverdue(t));
        if (overdue.length > 0) {
          pStr += '\nProject Overdue Tasks:\n' + overdue.map(t =>
            `- [${t.status}] ${t.title} (OVERDUE, due ${new Date(t.dueDate!).toLocaleDateString()})`
          ).join('\n');
        }
        if (open.length > 0) {
          pStr += '\nProject Open Tasks:\n' + open.map(t =>
            `- [${t.status}] ${t.title}${t.priority !== 'medium' ? ` (${t.priority})` : ''}${t.dueDate ? ` due ${new Date(t.dueDate).toLocaleDateString()}` : ''}`
          ).join('\n');
        }
      }

      const pHabits = p.habits;
      if (pHabits.length > 0) {
        pStr += '\nProject Habits:\n' + pHabits.map(h =>
          `- ${h.title} (${h.frequency})`
        ).join('\n');
      }

      const pGoals = p.goals;
      if (pGoals.length > 0) {
        pStr += '\nProject Goals:\n' + pGoals.map(g =>
          `- ${g.title} — ${g.milestones.filter(m => m.status === 'completed').length}/${g.milestones.length} milestones, progress ${g.progress}%${g.targetDate ? `, target ${new Date(g.targetDate).toLocaleDateString()}` : ''}`
        ).join('\n');
      }

      return pStr;
    }).join('\n\n'));
  }

  if (tasks.length > 0) {
    const overdue = tasks.filter(isOverdue);
    const open = tasks.filter(t => isOpen(t) && !isOverdue(t));
    if (overdue.length > 0) {
      parts.push('## Unassigned Overdue Tasks\n' + overdue.map(t =>
        `- [${t.status}] ${t.title} (OVERDUE, due ${new Date(t.dueDate!).toLocaleDateString()})`
      ).join('\n'));
    }
    if (open.length > 0) {
      parts.push('## Unassigned Open Tasks\n' + open.map(t =>
        `- [${t.status}] ${t.title}${t.priority !== 'medium' ? ` (${t.priority})` : ''}${t.dueDate ? ` due ${new Date(t.dueDate).toLocaleDateString()}` : ''}`
      ).join('\n'));
    }
  }

  if (habits.length > 0) {
    parts.push('## Unassigned Habits\n' + habits.map(h =>
      `- ${h.title} (${h.frequency})`
    ).join('\n'));
  }

  if (goals.length > 0) {
    parts.push('## Unassigned Goals\n' + goals.map(g =>
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

async function buildMessages(history: { role: string; content: string }[], userId: string, searchContext?: string, currentConversationId?: string) {
  const memoryContext = await getCachedMemoryContext(userId);
  const workspaceContext = await getWorkspaceContext(userId);
  const recentConversationsContext = await getCachedConversationsContext(userId, currentConversationId);
  let systemPrompt = chatSystemPrompt(memoryContext, workspaceContext, recentConversationsContext);

  // if search context exists, append it to system prompt
  if (searchContext) {
    systemPrompt += `\n\n=== WEB SEARCH RESULTS ===\n${searchContext}\n=== END WEB SEARCH RESULTS ===\nUse the web search results above if relevant to answer the query. Include citations when using facts from search.`;
  }
  return [
    { role: "system" as const, content: systemPrompt },
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
  toolsConfig?: { webSearch?: boolean },
): Promise<{ userMessage: unknown; assistantMessage: unknown }> {
  const prisma = getPrismaClient();

  const userMessage = await createMessageService(message, conversationId, "user");

  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  history.reverse();

  // 1. Perform Web Search if enabled
  const webSearchEnabled = !!(toolsConfig?.webSearch);
  let searchContext = "";
  if (webSearchEnabled && !isConversationalFiller(message)) {
    try {
      const searchCount = await getSearchCountThisMonth(prisma);
      if (searchCount < 250) {
        const searchResults = await webSearch.search(message);
        if (searchResults.length > 0) {
          searchContext = searchResults
            .map((r: any, i: number) => `[${i + 1}] Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.description || ""}`)
            .join("\n\n");
          
          await logToolExecution({
            conversationId,
            toolName: "web-search",
            status: "completed",
            input: { query: message },
            output: { resultsCount: searchResults.length },
          });
        }
      }
    } catch (err) {
      logger.error({ err }, "Web search failed in generateAiResponse");
    }
  }

  const messages = await buildMessages(history, userId, searchContext, conversationId);

  logger.info({ conversationId, history: buildHistory(history) }, "generateAiResponse messages");

  let aiContent = "";
  let tokensUsed = 0;
  let usedUserKey = false;

  try {
    const userKey = await getUserApiKey(userId);
    usedUserKey = !!userKey;

    // First Pass (Non-streaming)
    const completion = await nvidia.chatCompletion(messages, userKey ? { apiKey: userKey } : {});
    aiContent = completion.choices[0]?.message?.content || "";
    aiContent = aiContent.replace(/\[SYSTEM ACTION\][\s\S]*?\[END SYSTEM ACTION\]\s*/gi, '').trim();
    tokensUsed = completion.usage?.total_tokens || 0;

    // Parse tools to check if any are present
    const toolCalls = parseToolCalls(aiContent);
    if (toolCalls.length > 0) {
      // Execute tools
      const results: string[] = [];
      for (const tc of toolCalls) {
        const toolResult = await executeToolCall(tc.name, tc.params, userId);
        const resultText = `[${toolResult.success ? '✓' : '✗'}] ${toolResult.message}`;
        results.push(resultText);
      }
      
      const formattedExecutionResults = results.join('\n');
      
      // Clear cache since workspace modified
      workspaceCache.delete(userId);

      // Construct second pass messages
      const secondPassMessages = [
        ...messages,
        { role: "assistant" as const, content: aiContent },
        { role: "user" as const, content: formattedExecutionResults }
      ];

      // Second Pass (Non-streaming) to confirm
      const secondCompletion = await nvidia.chatCompletion(secondPassMessages, userKey ? { apiKey: userKey } : {});
      aiContent = secondCompletion.choices[0]?.message?.content || "";
      aiContent = aiContent.replace(/\[SYSTEM ACTION\][\s\S]*?\[END SYSTEM ACTION\]\s*/gi, '').trim();
      tokensUsed += secondCompletion.usage?.total_tokens || 0;
    }

    trackUsage({ userId, provider: "nvidia", model: process.env.NVIDIA_CHAT_MODEL || "meta/llama-3.1-8b-instruct", tokens: tokensUsed, cost: 0 }).catch(() => { });
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
  }).catch(() => { });

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

function isConversationalFiller(message: string): boolean {
  const normalized = message.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
  const fillers = new Set(["hi", "hello", "hey", "thanks", "thank you", "thx", "ok", "okay", "bye", "goodbye", "good morning", "good afternoon", "good evening"]);
  return fillers.has(normalized) || normalized.length <= 3;
}

async function getSearchCountThisMonth(prisma: any): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.toolExecution.count({
    where: {
      toolName: "web-search",
      status: "completed",
      startedAt: {
        gte: startOfMonth
      }
    }
  });
  return count;
}

export async function* streamAiResponse(
  message: string,
  conversationId: string,
  userId: string,
  toolsConfig?: { webSearch?: boolean },
): AsyncGenerator<string, void, unknown> {
  const prisma = getPrismaClient();

  const extractPromise = autoExtractMemories(message, userId).catch(() => 0);

  await createMessageService(message, conversationId, "user");

  const webSearchEnabled = !!(toolsConfig?.webSearch);
  let searchContext = "";

  // Perform web search if enabled
  if (webSearchEnabled && !isConversationalFiller(message)) {
    try {
      const searchCount = await getSearchCountThisMonth(prisma);
      if (searchCount >= 250) {
        logger.warn({ searchCount, userId }, "Google Web Search limit reached (250/month). Skipping web search.");
        yield "\n\n*(Note: Google search limit of 250 requests per month has been reached. Proceeding with offline knowledge.)*\n\n";
      } else {
        const searchResults = await webSearch.search(message);
        if (searchResults.length > 0) {
          searchContext = searchResults
            .map((r: any, i: number) => `[${i + 1}] Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.description || ""}`)
            .join("\n\n");
          // Yield sources to the controller (prefix with __sources__:)
          yield `__sources__:${JSON.stringify(searchResults)}`;

          await logToolExecution({
            conversationId,
            toolName: "web-search",
            status: "completed",
            input: { query: message },
            output: { resultsCount: searchResults.length },
          });
        }
      }
    } catch (err) {
      logger.error({ err }, "Web search failed");
      await logToolExecution({
        conversationId,
        toolName: "web-search",
        status: "failed",
        input: { query: message },
        output: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  }
  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  history.reverse();

  const messages = await buildMessages(history, userId, searchContext, conversationId);

  logger.info({ conversationId, history: buildHistory(history) }, "streamAiResponse messages");

  let fullContent = "";
  let streamError: unknown = null;
  let usedUserKey = false;
  let tokensUsed = 0;

  try {
    const userKey = await getUserApiKey(userId);
    usedUserKey = !!userKey;

    // Pass 1: Run non-streaming to check for tool calls
    const completion = await nvidia.chatCompletion(messages, userKey ? { apiKey: userKey } : {});
    const pass1Content = (completion.choices[0]?.message?.content || "")
      .replace(/\[SYSTEM ACTION\][\s\S]*?\[END SYSTEM ACTION\]\s*/gi, '').trim();
    tokensUsed = completion.usage?.total_tokens || 0;

    const toolCalls = parseToolCalls(pass1Content);

    if (toolCalls.length > 0) {
      // Execute the tools
      const results: string[] = [];
      for (const tc of toolCalls) {
        const toolResult = await executeToolCall(tc.name, tc.params, userId);
        const resultText = `[${toolResult.success ? '✓' : '✗'}] ${toolResult.message}`;
        results.push(resultText);
      }
      const formattedExecutionResults = results.join('\n');
      workspaceCache.delete(userId);

      // Construct messages for Second Pass
      const secondPassMessages = [
        ...messages,
        { role: "assistant" as const, content: pass1Content },
        { role: "user" as const, content: formattedExecutionResults }
      ];

      // Pass 2: Stream final conversational response to user
      const stream = nvidia.chatCompletionStream(secondPassMessages, userKey ? { apiKey: userKey } : {});
      for await (const chunk of stream) {
        fullContent += chunk;
        yield chunk;
      }
      tokensUsed += Math.ceil(fullContent.length / 4); // estimate tokens for streaming pass
    } else {
      // No tool calls: yield simulated stream for the already-generated conversational response
      fullContent = pass1Content;
      const chunkSize = 8;
      for (let i = 0; i < pass1Content.length; i += chunkSize) {
        yield pass1Content.slice(i, i + chunkSize);
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }
  } catch (err) {
    streamError = err;
    logger.error({ err, conversationId }, "streamAiResponse error");
  }

  if (!fullContent && streamError) {
    fullContent = "I'm sorry, I encountered an error and couldn't generate a response.";
    yield fullContent;
  }

  fullContent = fullContent.replace(/\[SYSTEM ACTION\][\s\S]*?\[END SYSTEM ACTION\]\s*/gi, '').trim();

  await createMessageService(fullContent, conversationId, "assistant");

  trackUsage({
    userId,
    provider: "nvidia",
    model: process.env.NVIDIA_CHAT_MODEL || "meta/llama-3.1-8b-instruct",
    tokens: tokensUsed,
    cost: 0,
  }).catch(() => { });

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
