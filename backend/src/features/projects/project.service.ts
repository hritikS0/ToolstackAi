import { getPrismaClient } from "../../shared/db/prismaClient.js";

const prisma = () => getPrismaClient();

export async function getProjects(userId: string) {
  return prisma().project.findMany({
    where: { userId },
    include: { threads: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function getProject(id: string, userId: string) {
  return prisma().project.findFirst({
    where: { id, userId },
    include: { threads: { orderBy: { createdAt: "asc" } } },
  });
}

export async function createProject(userId: string, data: { name: string; description?: string; icon?: string; color?: string }) {
  return prisma().project.create({
    data: { userId, ...data },
    include: { threads: true },
  });
}

export async function updateProject(id: string, userId: string, data: { name?: string; description?: string; icon?: string; color?: string }) {
  return prisma().project.updateMany({
    where: { id, userId },
    data,
  });
}

export async function deleteProject(id: string, userId: string) {
  return prisma().project.deleteMany({ where: { id, userId } });
}

export async function getThreads(projectId: string, userId: string) {
  const project = await prisma().project.findFirst({ where: { id: projectId, userId } });
  if (!project) return null;
  return prisma().thread.findMany({
    where: { projectId },
    include: { conversations: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });
}

export async function getThread(id: string, userId: string) {
  return prisma().thread.findFirst({
    where: { id, userId },
    include: { project: true, conversations: { orderBy: { createdAt: "desc" } } },
  });
}

export async function createThread(userId: string, data: { projectId: string; title: string; description?: string }) {
  return prisma().thread.create({
    data: { userId, ...data },
    include: { project: true, conversations: true },
  });
}

export async function updateThread(id: string, userId: string, data: { title?: string; description?: string; projectId?: string }) {
  return prisma().thread.updateMany({
    where: { id, userId },
    data,
  });
}

export async function deleteThread(id: string, userId: string) {
  return prisma().thread.deleteMany({ where: { id, userId } });
}

export async function linkConversationToThread(conversationId: string, threadId: string, userId: string) {
  const thread = await prisma().thread.findFirst({ where: { id: threadId, userId } });
  if (!thread) return null;
  return prisma().conversation.updateMany({
    where: { id: conversationId, userId },
    data: { threadId },
  });
}
