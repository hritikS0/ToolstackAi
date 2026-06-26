import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { nvidia } from "../../ai/providers/nvidia.js";

async function verifyGoalOwnership(goalId: string, userId: string) {
  const prisma = getPrismaClient();
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== userId) {
    throw Object.assign(new Error("Goal not found"), { statusCode: 404 });
  }
  return goal;
}

export async function createGoal(
  userId: string,
  data: {
    title: string;
    description?: string;
    targetDate?: string;
    projectId?: string;
  },
) {
  const prisma = getPrismaClient();
  const goal = await prisma.goal.create({
    data: {
      title: data.title,
      description: data.description,
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      projectId: data.projectId,
      userId,
      status: "active",
      progress: 0,
    },
  });

  const existingMemory = await prisma.memory.findFirst({
    where: { userId, title: data.title, category: "Goals" },
  });
  if (!existingMemory) {
    await prisma.memory.create({
      data: {
        userId,
        category: "Goals",
        title: data.title,
        content: data.description || data.title,
        importance: 4,
        confidence: 1.0,
        source: "goals-module",
      },
    }).catch(() => {});
  }

  return goal;
}

export async function getGoals(
  userId: string,
  filters?: { status?: string; projectId?: string },
) {
  const prisma = getPrismaClient();
  const where: Record<string, unknown> = { userId };
  if (filters?.status) where.status = filters.status;
  if (filters?.projectId) where.projectId = filters.projectId;

  const goals = await prisma.goal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { milestones: true },
  });
  return goals;
}

export async function getGoal(userId: string, goalId: string) {
  const prisma = getPrismaClient();
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { milestones: true },
  });
  if (!goal || goal.userId !== userId) {
    throw Object.assign(new Error("Goal not found"), { statusCode: 404 });
  }
  return goal;
}

export async function updateGoal(
  userId: string,
  goalId: string,
  data: {
    title?: string;
    description?: string;
    targetDate?: string;
    status?: "active" | "completed" | "archived";
  },
) {
  await verifyGoalOwnership(goalId, userId);
  const prisma = getPrismaClient();
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.targetDate !== undefined)
    updateData.targetDate = new Date(data.targetDate);
  if (data.status !== undefined) updateData.status = data.status;

  const goal = await prisma.goal.update({
    where: { id: goalId },
    data: updateData,
  });

  if (data.status === "completed") {
    const memory = await prisma.memory.findFirst({
      where: { userId, title: goal.title, category: "Goals" },
    });
    if (memory) {
      await prisma.memory.update({
        where: { id: memory.id },
        data: { content: `Completed: ${goal.title}. ${goal.description || ""}`, importance: Math.min(memory.importance + 1, 5) },
      }).catch(() => {});
    }
  }

  return goal;
}

export async function deleteGoal(userId: string, goalId: string) {
  await verifyGoalOwnership(goalId, userId);
  const prisma = getPrismaClient();
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (goal) {
    await prisma.memory.deleteMany({
      where: { userId, title: goal.title, category: "Goals" },
    }).catch(() => {});
  }
  await prisma.goal.delete({ where: { id: goalId } });
}

async function recalculateProgress(goalId: string) {
  const prisma = getPrismaClient();
  const milestones = await prisma.milestone.findMany({
    where: { goalId },
  });
  const total = milestones.length;
  const completed = milestones.filter((m) => m.status === "completed").length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  await prisma.goal.update({
    where: { id: goalId },
    data: { progress },
  });
}

export async function addMilestone(
  userId: string,
  goalId: string,
  data: { title: string; description?: string; order?: number },
) {
  await verifyGoalOwnership(goalId, userId);
  const prisma = getPrismaClient();
  const milestone = await prisma.milestone.create({
    data: {
      goalId,
      title: data.title,
      description: data.description,
      order: data.order ?? 0,
      status: "pending",
    },
  });
  await recalculateProgress(goalId);
  return milestone;
}

export async function updateMilestone(
  goalId: string,
  milestoneId: string,
  data: {
    title?: string;
    description?: string;
    status?: "pending" | "completed";
    order?: number;
  },
) {
  const prisma = getPrismaClient();
  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, goalId },
  });
  if (!milestone) {
    throw Object.assign(new Error("Milestone not found"), { statusCode: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.order !== undefined) updateData.order = data.order;

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: updateData,
  });

  await recalculateProgress(goalId);
  return updated;
}

export async function deleteMilestone(goalId: string, milestoneId: string) {
  const prisma = getPrismaClient();
  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, goalId },
  });
  if (!milestone) {
    throw Object.assign(new Error("Milestone not found"), { statusCode: 404 });
  }

  await prisma.milestone.delete({ where: { id: milestoneId } });
  await recalculateProgress(goalId);
}

export async function aiSuggestMilestones(userId: string, goalId: string) {
  const goal = await getGoal(userId, goalId);

  const completion = await nvidia.chatCompletion(
    [
      {
        role: "system",
        content:
          "You are a helpful project planning assistant. Given a goal, suggest 3-5 actionable milestones. Return ONLY a valid JSON array of objects with 'title' and 'description' fields. Do not include any other text.",
      },
      {
        role: "user",
        content: `Suggest milestones for this goal:\nTitle: ${goal.title}\nDescription: ${goal.description || "No description provided"}`,
      },
    ],
    { temperature: 0.7, maxTokens: 1024 },
  );

  const content = completion.choices[0]?.message?.content || "[]";
  let milestones: { title: string; description: string }[];
  try {
    milestones = JSON.parse(content);
    if (!Array.isArray(milestones)) milestones = [];
  } catch {
    milestones = [];
  }

  return milestones;
}

export async function aiAnalyzeProgress(userId: string, goalId: string) {
  const goal = await getGoal(userId, goalId);
  const milestones = (goal as any).milestones || [];

  const milestoneSummary = milestones
    .map(
      (m: { title: string; status: string; description?: string }) =>
        `- ${m.title} [${m.status}]${m.description ? `: ${m.description}` : ""}`,
    )
    .join("\n");

  const completion = await nvidia.chatCompletion(
    [
      {
        role: "system",
        content:
          "You are a helpful progress analysis assistant. Analyze the given goal and its milestones. Provide a concise analysis of the current progress, highlight what's going well, and suggest what to focus on next.",
      },
      {
        role: "user",
        content: `Analyze the progress for this goal:\n\nTitle: ${goal.title}\nDescription: ${goal.description || "No description"}\nStatus: ${goal.status}\nProgress: ${goal.progress}%\n\nMilestones:\n${milestoneSummary || "No milestones yet"}`,
      },
    ],
    { temperature: 0.7, maxTokens: 1024 },
  );

  return completion.choices[0]?.message?.content || "No analysis available.";
}
