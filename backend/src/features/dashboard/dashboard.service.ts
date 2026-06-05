import { getPrismaClient } from "../../shared/db/prismaClient.js";

export async function getDashboard(userId: string) {
  const prisma = getPrismaClient();

  const [conversations, allConversations, imageAnalyses, debugSessions, memories, identityMemories, skillsMemories, goalsMemories, preferenceMemories, recentMemories] = await Promise.all([
    prisma.conversation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.conversation.count({ where: { userId } }),
    prisma.toolExecution.count({ where: { userId, toolName: "image-analysis" } }),
    prisma.toolExecution.count({ where: { userId, toolName: "code-debugger" } }),
    prisma.memory.count({ where: { userId } }),
    prisma.memory.findMany({ where: { userId, category: "Identity" }, take: 1, orderBy: { importance: "desc" } }),
    prisma.memory.findMany({ where: { userId, category: "Skills" }, take: 3, orderBy: { importance: "desc" } }),
    prisma.memory.findMany({ where: { userId, category: "Goals" }, take: 3, orderBy: { importance: "desc" } }),
    prisma.memory.findMany({ where: { userId, category: "Preferences" }, take: 3, orderBy: { importance: "desc" } }),
    prisma.memory.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 4 }),
  ]);

  const chatCount = await prisma.conversation.count({ where: { userId, type: "chat" } });
  const pdfCount = await prisma.conversation.count({ where: { userId, type: "pdf" } });

  const dbProjects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 3,
  });

  const projectIds = dbProjects.map((p) => p.id);
  const projectMemories = await prisma.memory.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, importance: true },
  });

  const importanceMap = new Map(projectMemories.map((m) => [m.id, m.importance]));

  const projectsWithImportance = dbProjects.map((p) => ({
    id: p.id,
    title: p.name,
    content: p.description,
    importance: importanceMap.get(p.id) ?? 4,
    updatedAt: p.updatedAt,
  }));

  return {
    stats: {
      conversations: allConversations,
      chats: chatCount,
      pdfs: pdfCount,
      images: imageAnalyses,
      debugSessions,
      memories,
    },
    recentConversations: conversations.map((c) => ({
      id: c.id,
      title: c.title || "Untitled",
      type: c.type || "chat",
      createdAt: c.createdAt,
    })),
    recentMemories: recentMemories.map((m) => ({
      id: m.id,
      title: m.title,
      category: m.category,
      updatedAt: m.updatedAt,
    })),
    brain: {
      name: identityMemories[0]?.content || null,
      nameTitle: identityMemories[0]?.title || null,
      skills: skillsMemories.map((m) => ({ title: m.title, content: m.content, importance: m.importance })),
      goals: goalsMemories.map((m) => ({ title: m.title, content: m.content, importance: m.importance })),
      preferences: preferenceMemories.map((m) => ({ title: m.title, content: m.content })),
    },
    projects: projectsWithImportance,
  };
}
