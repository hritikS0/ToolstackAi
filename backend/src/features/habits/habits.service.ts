import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { nvidia } from "../../ai/providers/nvidia.js";
import { getUserKey } from "../api-keys/api-keys.service.js";

function getPeriodStart(frequency: string, date: Date = new Date()): Date {
  const d = new Date(date);
  switch (frequency) {
    case "daily":
      d.setHours(0, 0, 0, 0);
      return d;
    case "weekly": {
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      return monday;
    }
    case "monthly": {
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    default:
      d.setHours(0, 0, 0, 0);
      return d;
  }
}

function getPreviousPeriodStart(frequency: string, periodStart: Date): Date {
  const d = new Date(periodStart);
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() - 1);
      return d;
    case "weekly":
      d.setDate(d.getDate() - 7);
      return d;
    case "monthly":
      d.setMonth(d.getMonth() - 1);
      return d;
    default:
      d.setDate(d.getDate() - 1);
      return d;
  }
}

async function calculateStreak(
  prisma: ReturnType<typeof getPrismaClient>,
  habitId: string,
  frequency: string,
): Promise<{ currentStreak: number; longestStreak: number }> {
  const completions = await prisma.habitCompletion.findMany({
    where: { habitId },
    orderBy: { periodStart: "asc" },
    select: { periodStart: true },
  });

  const uniquePeriods = new Set<string>();
  for (const c of completions) {
    uniquePeriods.add(new Date(c.periodStart).toISOString().slice(0, 10));
  }

  const sortedPeriods = Array.from(uniquePeriods)
    .map((s) => new Date(s))
    .sort((a, b) => a.getTime() - b.getTime());

  let longestStreak = 0;
  let tempStreak = 0;
  let prevPeriod: Date | null = null;

  for (const period of sortedPeriods) {
    if (!prevPeriod) {
      tempStreak = 1;
    } else {
      const expectedPrev = new Date(period);
      switch (frequency) {
        case "daily":
          expectedPrev.setDate(expectedPrev.getDate() - 1);
          break;
        case "weekly":
          expectedPrev.setDate(expectedPrev.getDate() - 7);
          break;
        case "monthly":
          expectedPrev.setMonth(expectedPrev.getMonth() - 1);
          break;
      }
      if (prevPeriod.getTime() === expectedPrev.getTime()) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
    prevPeriod = period;
  }

  const today = new Date();
  const currentPeriodStart = getPeriodStart(frequency, today);
  const currentPeriodKey = currentPeriodStart.toISOString().slice(0, 10);

  let currentStreak = 0;
  if (uniquePeriods.has(currentPeriodKey)) {
    currentStreak = 1;
    let checkPeriod = getPreviousPeriodStart(frequency, currentPeriodStart);
    while (true) {
      if (uniquePeriods.has(checkPeriod.toISOString().slice(0, 10))) {
        currentStreak++;
        checkPeriod = getPreviousPeriodStart(frequency, checkPeriod);
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak };
}

async function isCompletedForCurrentPeriod(
  prisma: ReturnType<typeof getPrismaClient>,
  habitId: string,
  frequency: string,
): Promise<boolean> {
  const periodStart = getPeriodStart(frequency);
  const existing = await prisma.habitCompletion.findFirst({
    where: {
      habitId,
      periodStart: {
        gte: periodStart,
        lt: new Date(periodStart.getTime() + 86400000),
      },
    },
  });
  return existing !== null;
}

export async function createHabit(
  userId: string,
  data: { title: string; description?: string; frequency: string; targetCount?: string; projectId?: string },
) {
  const prisma = getPrismaClient();
  return prisma.habit.create({
    data: {
      userId,
      title: data.title,
      description: data.description || "",
      frequency: data.frequency,
      targetCount: data.targetCount || "1",
      projectId: data.projectId || null,
      active: true,
    },
  });
}

export async function getHabits(userId: string, projectId?: string) {
  const prisma = getPrismaClient();
  const where: Record<string, unknown> = { userId };
  if (projectId) where.projectId = projectId;

  const habits = await prisma.habit.findMany({
    where: where as any,
    include: { completions: true },
    orderBy: { createdAt: "desc" },
  });

  const result = [];
  for (const habit of habits) {
    const periodStart = getPeriodStart(habit.frequency);
    const completed = habit.completions.some(
      (c) => new Date(c.periodStart).getTime() === periodStart.getTime()
    );
    result.push({
      ...habit,
      completedToday: completed,
      todayCompleted: completed,
    });
  }
  return result;
}

export async function getHabitStats(userId: string, habitId: string) {
  const prisma = getPrismaClient();
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
    include: { completions: { orderBy: { completedAt: "asc" } } },
  });

  if (!habit || habit.userId !== userId) {
    throw Object.assign(new Error("Habit not found"), { statusCode: 404 });
  }

  const { currentStreak, longestStreak } = await calculateStreak(prisma, habitId, habit.frequency);

  const totalCompletions = habit.completions.length;
  const uniqueDays = new Set<string>();
  for (const c of habit.completions) {
    uniqueDays.add(new Date(c.periodStart).toISOString().slice(0, 10));
  }

  const habitStart = new Date(habit.createdAt);
  const now = new Date();
  const daysSinceCreation = Math.max(1, Math.ceil((now.getTime() - habitStart.getTime()) / 86400000));
  const completionRate = Math.round((uniqueDays.size / daysSinceCreation) * 100);

  const heatmap: { date: string; completed: boolean }[] = [];
  const completedSet = new Set<string>();
  for (const c of habit.completions) {
    completedSet.add(new Date(c.periodStart).toISOString().slice(0, 10));
  }

  for (let i = 27; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    heatmap.push({ date: dateStr, completed: completedSet.has(dateStr) });
  }

  return {
    habit,
    currentStreak,
    longestStreak,
    completionRate,
    heatmap,
  };
}

export async function updateHabit(
  userId: string,
  habitId: string,
  data: Record<string, unknown>,
) {
  const prisma = getPrismaClient();
  const existing = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!existing || existing.userId !== userId) {
    throw Object.assign(new Error("Habit not found"), { statusCode: 404 });
  }
  return prisma.habit.update({ where: { id: habitId }, data });
}

export async function deleteHabit(userId: string, habitId: string) {
  const prisma = getPrismaClient();
  const existing = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!existing || existing.userId !== userId) {
    throw Object.assign(new Error("Habit not found"), { statusCode: 404 });
  }
  await prisma.habitCompletion.deleteMany({ where: { habitId } });
  await prisma.habit.delete({ where: { id: habitId } });
}

export async function completeHabit(userId: string, habitId: string) {
  const prisma = getPrismaClient();
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit || habit.userId !== userId) {
    throw Object.assign(new Error("Habit not found"), { statusCode: 404 });
  }

  const periodStart = getPeriodStart(habit.frequency);
  const existing = await prisma.habitCompletion.findFirst({
    where: { habitId, periodStart },
  });

  if (existing) {
    await prisma.habitCompletion.delete({ where: { id: existing.id } });
    return { completed: false };
  }

  await prisma.habitCompletion.create({
    data: {
      habitId,
      completedAt: new Date(),
      periodStart,
    },
  });
  return { completed: true };
}

export async function aiCreateHabit(userId: string, message: string) {
  const userKey = await getUserKey(userId, "nvidia");
  const completion = await nvidia.chatCompletion(
    [
      {
        role: "system",
        content:
          "You are a habit creation assistant. Parse the user's natural language description into a habit object. Return ONLY valid JSON with these fields: { title: string, frequency: 'daily'|'weekly'|'monthly', targetCount?: string, description?: string }. The title should be concise (max 200 chars).",
      },
      { role: "user", content: message },
    ],
    { temperature: 0.3, maxTokens: 300, apiKey: userKey || undefined },
  );

  const raw = completion.choices[0]?.message?.content || "{}";
  let cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    cleaned = objMatch[0];
  }

  let parsed: { title: string; frequency: string; targetCount?: string; description?: string };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw Object.assign(new Error("Failed to parse AI response"), { statusCode: 500 });
  }

  if (!parsed.title || !parsed.frequency) {
    throw Object.assign(new Error("AI did not provide required habit fields"), { statusCode: 422 });
  }

  const validFrequencies = ["daily", "weekly", "monthly"];
  if (!validFrequencies.includes(parsed.frequency)) {
    parsed.frequency = "daily";
  }

  return createHabit(userId, {
    title: parsed.title,
    description: parsed.description,
    frequency: parsed.frequency,
    targetCount: parsed.targetCount,
  });
}

export async function aiAnalyzeHabits(userId: string) {
  const prisma = getPrismaClient();
  const habits = await prisma.habit.findMany({
    where: { userId, active: true },
  });

  if (habits.length === 0) {
    return { insights: "No active habits to analyze." };
  }

  const habitSummaries: string[] = [];
  for (const habit of habits) {
    const stats = await getHabitStats(userId, habit.id);
    habitSummaries.push(
      `${habit.title} (${habit.frequency}): streak=${stats.currentStreak}, rate=${stats.completionRate}%`,
    );
  }

  const prompt = `Analyze these user habits and provide brief, actionable insights (2-4 bullet points) about patterns, consistency, and suggestions for improvement:\n\n${habitSummaries.join("\n")}`;

  const completion = await nvidia.chatCompletion(
    [
      {
        role: "system",
        content:
          "You are a habit analysis coach. Provide concise, actionable insights based on habit data. Keep it brief and helpful.",
      },
      { role: "user", content: prompt },
    ],
    { temperature: 0.5, maxTokens: 400 },
  );

  const insights = completion.choices[0]?.message?.content || "Unable to generate insights at this time.";

  return { insights };
}
