import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { nvidia } from "../../ai/providers/nvidia.js";

function heuristicCategorization(subject: string, fromAddress: string, bodyText: string) {
  const text = `${subject} ${fromAddress} ${bodyText}`.toLowerCase();

  if (/invoice|receipt|payment|bill|order|stripe|paypal|bank|statement|transaction/i.test(text)) {
    return { category: "finance", urgency: 2, aiSummary: `Financial email regarding ${subject}` };
  }
  if (/newsletter|digest|unsubscribe|weekly|substack|medium|edition|issue/i.test(text)) {
    return { category: "newsletter", urgency: 1, aiSummary: `Newsletter update: ${subject}` };
  }
  if (/action required|urgent|asap|please review|deadline|reminder|action needed/i.test(text)) {
    return { category: "action_required", urgency: 4, aiSummary: `Action required regarding ${subject}` };
  }
  if (/no-reply|noreply|notification|security alert|verify|welcome|login/i.test(text)) {
    return { category: "updates", urgency: 2, aiSummary: `Notification regarding ${subject}` };
  }
  if (/winner|lottery|discount|free offer|promo|deal|sale/i.test(text)) {
    return { category: "spam", urgency: 1, aiSummary: `Promotional email: ${subject}` };
  }

  return { category: "primary", urgency: 1, aiSummary: `Email thread: ${subject}` };
}

export async function categorizeThread(userId: string, threadId: string) {
  const prisma = getPrismaClient();

  const thread = await prisma.emailThread.findFirst({
    where: { id: threadId, account: { userId } },
    include: {
      messages: {
        orderBy: { sentAt: "asc" },
      },
    },
  });

  if (!thread || thread.messages.length === 0) {
    throw new Error("Thread not found or has no messages");
  }

  const latest = thread.messages[thread.messages.length - 1];

  const emailContents = thread.messages
    .map(
      (m, idx) =>
        `--- Message #${idx + 1} from ${m.fromName || m.fromAddress} (${m.sentAt.toISOString()}) ---\nSubject: ${m.subject}\n\n${m.bodyText.substring(0, 1000)}`
    )
    .join("\n\n");

  const prompt = `You are an AI Email Classifier and Assistant for Toolstack AI. Analyze the following email thread:

${emailContents}

Respond ONLY with a raw JSON object (no markdown code fences, no extra text) with the following structure:
{
  "category": "action_required" | "primary" | "updates" | "finance" | "newsletter" | "spam",
  "urgency": number from 1 (lowest) to 5 (critical),
  "aiSummary": "2 concise sentences summarizing the thread",
  "actionItems": ["action item 1", "action item 2"]
}`;

  try {
    const response = await nvidia.chatCompletion([
      { role: "system", content: "You are a precise JSON-only email analyzer." },
      { role: "user", content: prompt },
    ]);

    const content = response.choices[0]?.message?.content || "{}";
    const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleaned);

    const updated = await prisma.emailThread.update({
      where: { id: threadId },
      data: {
        category: result.category || "primary",
        urgency: typeof result.urgency === "number" ? result.urgency : 1,
        aiSummary: result.aiSummary || "Summary unavailable",
        actionItems: Array.isArray(result.actionItems) ? result.actionItems : [],
      },
    });

    return updated;
  } catch (error: any) {
    console.error("AI categorization failed, using heuristic classification fallback:", error.message || error);
    const fallback = heuristicCategorization(thread.subject, latest.fromAddress, latest.bodyText);
    
    return prisma.emailThread.update({
      where: { id: threadId },
      data: {
        category: fallback.category,
        urgency: fallback.urgency,
        aiSummary: fallback.aiSummary,
        actionItems: [],
      },
    });
  }
}

export async function categorizeAllThreads(userId: string) {
  const prisma = getPrismaClient();

  const threads = await prisma.emailThread.findMany({
    where: { account: { userId } },
    select: { id: true },
    take: 50,
  });

  let categorizedCount = 0;
  for (const t of threads) {
    try {
      await categorizeThread(userId, t.id);
      categorizedCount++;
    } catch (err) {
      console.error(`Failed to auto-categorize thread ${t.id}:`, err);
    }
  }

  return { categorizedCount, totalProcessed: threads.length };
}

export async function generateDraftReply(
  userId: string,
  data: {
    threadId: string;
    preset?: "quick_reply" | "formal" | "polite_decline" | "follow_up" | "detailed";
    tone?: "professional" | "casual" | "direct" | "warm" | "persuasive";
    formatType?: "bullet_points" | "formal_letter" | "concise" | "detailed";
    userInstruction?: string;
    includeWorkspaceContext?: boolean;
  }
) {
  const prisma = getPrismaClient();

  const thread = await prisma.emailThread.findFirst({
    where: { id: data.threadId, account: { userId } },
    include: {
      messages: {
        orderBy: { sentAt: "asc" },
      },
    },
  });

  if (!thread || thread.messages.length === 0) {
    throw new Error("Thread not found or contains no messages");
  }

  const latestMessage = thread.messages[thread.messages.length - 1];

  let contextText = "";
  if (data.includeWorkspaceContext) {
    try {
      const [userNotes, userTasks] = await Promise.all([
        prisma.note.findMany({ where: { userId }, take: 3, orderBy: { updatedAt: "desc" } }),
        prisma.task.findMany({ where: { userId, status: { not: "completed" } }, take: 5 }),
      ]);
      contextText = `\n--- Toolstack Workspace Context ---\nRecent Notes:\n${userNotes.map(n => `- ${n.title}: ${n.content.substring(0, 150)}`).join("\n")}\n\nActive Tasks:\n${userTasks.map(t => `- [${t.priority}] ${t.title}`).join("\n")}\n`;
    } catch {
      contextText = "";
    }
  }

  const presetGuides: Record<string, string> = {
    quick_reply: "Draft a brief, 1-2 sentence acknowledgment or quick answer.",
    formal: "Draft a polished, professional email response with formal greeting and signature.",
    polite_decline: "Draft a polite, respectful refusal offering alternative solutions if possible.",
    follow_up: "Draft a clear follow-up email asking for pending updates or next steps.",
    detailed: "Draft a comprehensive response addressing every point raised in the email.",
  };

  const toneGuides: Record<string, string> = {
    professional: "Use a clear, respectful, corporate tone.",
    casual: "Use a friendly, conversational tone.",
    direct: "Get straight to the point without extra fluff.",
    warm: "Use an empathetic, welcoming tone.",
    persuasive: "Use compelling, convincing language.",
  };

  const prompt = `You are an AI Email Assistant for Toolstack AI. Draft a reply to this email thread:

--- EMAIL THREAD ---
${thread.messages.map(m => `From: ${m.fromName || m.fromAddress}\nSubject: ${m.subject}\nBody: ${m.bodyText.substring(0, 800)}`).join("\n---\n")}

${contextText}

--- INSTRUCTIONS ---
Preset Strategy: ${presetGuides[data.preset || "formal"] || presetGuides.formal}
Tone Style: ${toneGuides[data.tone || "professional"] || toneGuides.professional}
Format Type: ${data.formatType || "concise"}
${data.userInstruction ? `User Custom Note: ${data.userInstruction}` : ""}

Draft a response email body text only.`;

  try {
    const response = await nvidia.chatCompletion([
      { role: "system", content: "You are an expert executive email drafter." },
      { role: "user", content: prompt },
    ]);

    const draftBody = response.choices[0]?.message?.content || "Thank you for your message. I have received your email and will follow up shortly.";

    return {
      threadId: thread.id,
      to: [latestMessage.fromAddress],
      subject: thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`,
      draftBody,
    };
  } catch (error: any) {
    console.error("AI Draft Generation error:", error);
    return {
      threadId: thread.id,
      to: [latestMessage.fromAddress],
      subject: thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`,
      draftBody: `Hi ${latestMessage.fromName || "there"},\n\nThank you for reaching out regarding "${thread.subject}". I have received your message and will review it promptly.\n\nBest regards,`,
    };
  }
}
