import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { nvidia } from "../../ai/providers/nvidia.js";
import { getUserKey } from "../api-keys/api-keys.service.js";
import type { CreateTaskInput, UpdateTaskInput } from "./tasks.validator.js";

export async function createTask(userId: string, data: CreateTaskInput) {
  const prisma = getPrismaClient();
  return prisma.task.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      priority: data.priority || "medium",
      status: "todo",
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      tags: data.tags || [],
      projectId: data.projectId,
    },
  });
}

export async function getTasks(
  userId: string,
  filters?: { status?: string; priority?: string; projectId?: string },
) {
  const prisma = getPrismaClient();
  const where: Record<string, unknown> = { userId };
  if (filters?.status) where.status = filters.status;
  if (filters?.priority) where.priority = filters.priority;
  if (filters?.projectId) where.projectId = filters.projectId;

  return prisma.task.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function getTask(userId: string, taskId: string) {
  const prisma = getPrismaClient();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.userId !== userId) {
    throw Object.assign(new Error("Task not found"), { statusCode: 404 });
  }
  return task;
}

export async function updateTask(userId: string, taskId: string, data: UpdateTaskInput) {
  const prisma = getPrismaClient();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.userId !== userId) {
    throw Object.assign(new Error("Task not found"), { statusCode: 404 });
  }
  return prisma.task.update({
    where: { id: taskId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.projectId !== undefined && { projectId: data.projectId }),
    },
  });
}

export async function deleteTask(userId: string, taskId: string) {
  const prisma = getPrismaClient();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.userId !== userId) {
    throw Object.assign(new Error("Task not found"), { statusCode: 404 });
  }
  await prisma.task.delete({ where: { id: taskId } });
}

export async function aiCreateTask(userId: string, message: string) {
  const userKey = await getUserKey(userId, "nvidia");
  const completion = await nvidia.chatCompletion([
    {
      role: "system",
      content:
        "You are a task management assistant. Parse the user's natural language input into a structured task object in JSON format. The JSON must have these fields: title (string, required), description (string, optional), priority (one of: low, medium, high, critical), dueDate (ISO date string or null if not specified), tags (array of strings). Respond with ONLY valid JSON, no other text.",
    },
    { role: "user", content: message },
  ], { apiKey: userKey || undefined });

  const result = completion.choices[0]?.message?.content || "";
  const parsed = JSON.parse(result);

  return createTask(userId, {
    title: parsed.title,
    description: parsed.description,
    priority: parsed.priority || "medium",
    dueDate: parsed.dueDate || undefined,
    tags: parsed.tags || [],
    projectId: parsed.projectId,
  });
}

export async function aiSuggestPriorities(userId: string) {
  const prisma = getPrismaClient();
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: { not: "done" },
    },
    orderBy: { createdAt: "desc" },
  });

  if (tasks.length === 0) {
    return { suggestions: [], reasoning: "No open tasks to analyze." };
  }

  const taskList = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate?.toISOString() || null,
    tags: t.tags,
  }));

  const completion = await nvidia.chatCompletion([
    {
      role: "system",
      content:
        "You are a task management assistant. Analyze the provided list of open tasks and suggest priority reordering. Return a JSON object with: 'suggestions' (array of { id, suggestedPriority, reasoning } objects for tasks that should be reprioritized) and 'reasoning' (string summary of your analysis). Only include tasks that need priority changes. Respond with ONLY valid JSON, no other text.",
    },
    { role: "user", content: JSON.stringify(taskList) },
  ]);

  const result = completion.choices[0]?.message?.content || "";
  return JSON.parse(result);
}
