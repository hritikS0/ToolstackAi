import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { nvidia } from "../../ai/providers/nvidia.js";
import * as tasksService from "../tasks/tasks.service.js";
import type { CreateNoteInput, UpdateNoteInput } from "./notes.validator.js";

export async function createNote(userId: string, data: CreateNoteInput) {
  const prisma = getPrismaClient();
  return prisma.note.create({
    data: {
      userId,
      title: data.title,
      content: data.content || "",
      tags: data.tags || [],
      projectId: data.projectId || null,
    },
  });
}

export async function getNotes(
  userId: string,
  filters?: { search?: string; tag?: string; projectId?: string },
) {
  const prisma = getPrismaClient();
  const where: Record<string, unknown> = { userId };

  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { content: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters?.tag) {
    where.tags = { has: filters.tag };
  }

  if (filters?.projectId) {
    where.projectId = filters.projectId;
  }

  return prisma.note.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
}

export async function getNote(userId: string, noteId: string) {
  const prisma = getPrismaClient();
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note || note.userId !== userId) {
    throw Object.assign(new Error("Note not found"), { statusCode: 404 });
  }
  return note;
}

export async function updateNote(userId: string, noteId: string, data: UpdateNoteInput) {
  const prisma = getPrismaClient();
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note || note.userId !== userId) {
    throw Object.assign(new Error("Note not found"), { statusCode: 404 });
  }
  return prisma.note.update({
    where: { id: noteId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.projectId !== undefined && { projectId: data.projectId }),
    },
  });
}

export async function deleteNote(userId: string, noteId: string) {
  const prisma = getPrismaClient();
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note || note.userId !== userId) {
    throw Object.assign(new Error("Note not found"), { statusCode: 404 });
  }
  await prisma.note.delete({ where: { id: noteId } });
}

export async function summarizeNote(userId: string, noteId: string) {
  const note = await getNote(userId, noteId);

  const completion = await nvidia.chatCompletion([
    {
      role: "system",
      content:
        "You are a note summarization assistant. Generate a concise summary of the provided note content. Keep it clear and under 3 sentences. Respond with ONLY the summary text, no other formatting.",
    },
    { role: "user", content: note.content },
  ]);

  return { summary: completion.choices[0]?.message?.content || "" };
}

export async function extractTasksFromNote(userId: string, noteId: string) {
  const note = await getNote(userId, noteId);

  const completion = await nvidia.chatCompletion([
    {
      role: "system",
      content:
        "You are a task extraction assistant. Analyze the provided note content and extract actionable items. Return a JSON object with an 'items' array. Each item must have: title (string), priority (one of: low, medium, high, critical). Only extract clear action items. Respond with ONLY valid JSON, no other text.",
    },
    { role: "user", content: note.content },
  ]);

  const result = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(result);
  const items: { title: string; priority: string }[] = parsed.items || [];

  const createdTasks = await Promise.all(
    items.map((item) =>
      tasksService.createTask(userId, {
        title: item.title,
        priority: (item.priority as "low" | "medium" | "high" | "critical") || "medium",
        description: `Extracted from note: ${note.title}`,
        tags: [],
        projectId: note.projectId || undefined,
      }),
    ),
  );

  return { tasks: createdTasks };
}

export async function searchNotes(userId: string, query: string) {
  const prisma = getPrismaClient();
  const allNotes = await prisma.note.findMany({
    where: { userId },
    select: { id: true, title: true, content: true, tags: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  if (allNotes.length === 0) {
    return { results: [] };
  }

  const notesSummary = allNotes.map((n) => ({
    id: n.id,
    title: n.title,
    snippet: n.content.slice(0, 500),
    tags: n.tags,
  }));

  const completion = await nvidia.chatCompletion([
    {
      role: "system",
      content:
        "You are a semantic search assistant. Given a search query and a list of notes with titles and content snippets, find the most relevant notes. Return a JSON object with a 'results' array of objects, each with: id (the note id), relevance (a score from 0 to 1). Only include notes that are relevant to the query. Sort by relevance descending. Respond with ONLY valid JSON, no other text.",
    },
    {
      role: "user",
      content: JSON.stringify({ query, notes: notesSummary }),
    },
  ]);

  const result = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(result);
  const results: { id: string; relevance: number }[] = parsed.results || [];

  const noteMap = new Map(allNotes.map((n) => [n.id, n]));
  return {
    results: results.map((r) => {
      const note = noteMap.get(r.id);
      return note ? { ...note, relevance: r.relevance } : null;
    }).filter(Boolean),
  };
}
