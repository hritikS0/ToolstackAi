import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { logger } from "../../shared/utils/logger.js";

export async function getMemories(
  userId: string,
  params: { search?: string; category?: string; sort?: string; pinned?: boolean },
) {
  const prisma = getPrismaClient();
  const where: Record<string, unknown> = { userId };

  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: "insensitive" } },
      { content: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params.category) where.category = params.category;
  if (params.pinned !== undefined) where.pinned = params.pinned;

  const orderBy: Record<string, string> =
    params.sort === "oldest"
      ? { createdAt: "asc" as const }
      : params.sort === "importance"
        ? { importance: "desc" as const }
        : { createdAt: "desc" as const };

  return prisma.memory.findMany({ where: where as any, orderBy });
}

export async function getMemoryById(id: string, userId: string) {
  const prisma = getPrismaClient();
  const memory = await prisma.memory.findUnique({ where: { id } });
  if (!memory || memory.userId !== userId) {
    throw Object.assign(new Error("Memory not found"), { statusCode: 404 });
  }
  return memory;
}

export async function createMemory(
  userId: string,
  data: {
    title: string;
    content: string;
    category: string;
    importance: number;
    confidence: number;
    source?: string;
  },
) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const created = await tx.memory.create({
      data: { ...data, userId },
    });

    if (data.category === "Goals") {
      const existingGoal = await tx.goal.findFirst({
        where: { userId, title: data.title },
      });
      if (!existingGoal) {
        const goal = await tx.goal.create({
          data: {
            userId,
            title: data.title,
            description: data.content,
            status: "active",
            progress: 0,
            sourceMemoryId: created.id,
          },
        });
        await tx.milestone.create({
          data: {
            goalId: goal.id,
            title: data.title,
            description: data.content,
            status: "pending",
            order: 1,
          },
        });
      }
    }

    if (data.category === "Projects") {
      const existingProject = await tx.project.findFirst({
        where: { userId, name: data.title },
      });
      if (!existingProject) {
        await tx.project.create({
          data: {
            id: created.id,
            userId,
            name: data.title,
            description: data.content,
            color: "#f59e0b",
            icon: "folder",
          },
        });
      }
    }

    return created;
  });
}

export async function updateMemory(
  id: string,
  userId: string,
  data: Record<string, unknown>,
) {
  const prisma = getPrismaClient();
  const existing = await prisma.memory.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw Object.assign(new Error("Memory not found"), { statusCode: 404 });
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.memory.update({ where: { id }, data });

    if (existing.category === "Projects") {
      const projectUpdateData: Record<string, any> = {};
      if (data.title !== undefined) projectUpdateData.name = data.title;
      if (data.content !== undefined) projectUpdateData.description = data.content;

      if (Object.keys(projectUpdateData).length > 0) {
        await tx.project.update({
          where: { id },
          data: projectUpdateData,
        });
      }
    }

    return updated;
  });
}

export async function deleteMemory(id: string, userId: string) {
  const prisma = getPrismaClient();
  const existing = await prisma.memory.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw Object.assign(new Error("Memory not found"), { statusCode: 404 });
  }

  await prisma.$transaction(async (tx) => {
    if (existing.category === "Goals") {
      await tx.goal.deleteMany({
        where: { userId, sourceMemoryId: id },
      });
    }

    if (existing.category === "Projects") {
      await tx.project.deleteMany({
        where: { userId, id: id },
      });
    }

    await tx.memory.delete({ where: { id } });
  });
}

export async function getDashboard(userId: string) {
  const prisma = getPrismaClient();
  const [totalMemories, categories, pinned, settings] = await Promise.all([
    prisma.memory.count({ where: { userId } }),
    prisma.memory.groupBy({ by: ["category"], where: { userId }, _count: true }),
    prisma.memory.count({ where: { userId, pinned: true } }),
    getOrCreateSettings(userId),
  ]);

  const recent = await prisma.memory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const byCategory = Object.fromEntries(categories.map((c) => [c.category, c._count]));

  return {
    totalMemories,
    pinnedMemories: pinned,
    categories: byCategory,
    recentActivity: recent.map((m) => ({
      id: m.id,
      title: m.title,
      category: m.category,
      action: "created",
      timestamp: m.createdAt,
    })),
    memoryEnabled: settings.memoryEnabled,
  };
}

export async function getOrCreateSettings(userId: string) {
  const prisma = getPrismaClient();
  let settings = await prisma.brainSettings.findUnique({ where: { userId } });
  if (!settings) {
    settings = await prisma.brainSettings.create({
      data: { userId },
    });
  }
  return settings;
}

export async function updateSettings(
  userId: string,
  data: Record<string, unknown>,
) {
  const prisma = getPrismaClient();
  await getOrCreateSettings(userId);
  return prisma.brainSettings.update({ where: { userId }, data });
}

export async function deleteAllMemories(userId: string) {
  const prisma = getPrismaClient();
  await prisma.memory.deleteMany({ where: { userId } });
}

export async function getMemoriesForContext(userId: string): Promise<string> {
  const prisma = getPrismaClient();
  const settings = await getOrCreateSettings(userId);
  if (!settings.memoryEnabled) return "";

  const memories = await prisma.memory.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { importance: "desc" }, { updatedAt: "desc" }],
    take: 20,
  });

  if (memories.length === 0) return "";

  const sections = memories.map(
    (m) => `[${m.category}] ${m.title}: ${m.content}${m.pinned ? " (pinned)" : ""}`,
  );

  return `\n\nKnown information about the user:\n${sections.join("\n")}`;
}

export async function autoExtractMemories(userMessage: string, userId: string): Promise<number> {
  const prisma = getPrismaClient();
  const settings = await getOrCreateSettings(userId);
  if (!settings.autoExtract || !settings.memoryEnabled) return 0;

  if (!userMessage.match(/\b(I|my|me|mine|I'm|I've|I'll|I'd)\b/i)) return 0;

  let saved = 0;
  try {
    const { nvidia } = await import("../../ai/providers/nvidia.js");
    const { memoryExtractionPrompt } = await import("../../ai/prompts/prompts.js");
    const { getUserKey } = await import("../api-keys/api-keys.service.js");

    const userKey = await getUserKey(userId, "nvidia");
    const prompt = memoryExtractionPrompt(userMessage);
    const completion = await nvidia.chatCompletion(
      [
        { role: "system", content: "You are a memory extraction system. Extract personal facts from user messages. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      { temperature: 0.1, maxTokens: 500, apiKey: userKey || undefined },
    );

    const raw = completion.choices[0]?.message?.content || "[]";
    let cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      cleaned = arrayMatch[0];
    }
    const extracted: { category: string; title: string; content: string; importance: number; confidence: number }[] = JSON.parse(cleaned);
    if (!Array.isArray(extracted) || extracted.length === 0) return 0;

    for (const mem of extracted) {
      if (!mem.category || !mem.title || !mem.content) continue;

      const existing = await prisma.memory.findFirst({
        where: { userId, title: mem.title, category: mem.category },
      });

      if (existing) {
        if (settings.allowUpdates) {
          await prisma.memory.update({
            where: { id: existing.id },
            data: {
              content: mem.content,
              importance: Math.max(existing.importance, mem.importance),
              confidence: mem.confidence,
              source: userMessage.slice(0, 200),
            },
          });
          saved++;
        }
        continue;
      }

      const created = await prisma.memory.create({
        data: {
          userId,
          category: mem.category || "Personal",
          title: mem.title,
          content: mem.content,
          importance: Math.min(Math.max(mem.importance || 1, 1), 5),
          confidence: Math.min(Math.max(mem.confidence || 0.5, 0), 1),
          source: userMessage.slice(0, 200),
        },
      });
      saved++;


    }
  } catch (err) {
    logger.error({ err, userId }, "Memory extraction failed");
  }
  return saved;
}
