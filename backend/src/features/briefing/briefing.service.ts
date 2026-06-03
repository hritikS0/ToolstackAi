import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { nvidia } from "../../ai/providers/nvidia.js";

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
    case "monthly":
      return new Date(d.getFullYear(), d.getMonth(), 1);
    default:
      d.setHours(0, 0, 0, 0);
      return d;
  }
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

async function isHabitCompletedForToday(
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

async function calculateHabitStreak(
  prisma: ReturnType<typeof getPrismaClient>,
  habitId: string,
  frequency: string,
): Promise<number> {
  const completions = await prisma.habitCompletion.findMany({
    where: { habitId },
    orderBy: { periodStart: "asc" },
    select: { periodStart: true },
  });

  const uniquePeriods = new Set<string>();
  for (const c of completions) {
    uniquePeriods.add(new Date(c.periodStart).toISOString().slice(0, 10));
  }

  const today = new Date();
  const currentPeriodStart = getPeriodStart(frequency, today);
  const currentPeriodKey = currentPeriodStart.toISOString().slice(0, 10);

  if (!uniquePeriods.has(currentPeriodKey)) return 0;

  let streak = 1;
  let checkPeriod = new Date(currentPeriodStart);

  while (true) {
    switch (frequency) {
      case "daily":
        checkPeriod.setDate(checkPeriod.getDate() - 1);
        break;
      case "weekly":
        checkPeriod.setDate(checkPeriod.getDate() - 7);
        break;
      case "monthly":
        checkPeriod.setMonth(checkPeriod.getMonth() - 1);
        break;
    }

    if (uniquePeriods.has(checkPeriod.toISOString().slice(0, 10))) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export async function getBriefing(userId: string) {
  const prisma = getPrismaClient();
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });

  const firstName = user?.fullName?.split(" ")[0] || "developer";

  const [tasks, goals, projects, habits] = await Promise.all([
    prisma.task.findMany({
      where: { userId },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    }),
    prisma.goal.findMany({
      where: { userId },
    }),
    prisma.project.findMany({
      where: { userId },
      include: { _count: { select: { tasks: true } } },
    }),
    prisma.habit.findMany({
      where: { userId, active: true },
    }),
  ]);

  const openTasks = tasks.filter((t) => t.status !== "done" && t.status !== "archived");
  const overdueTasks = openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now);

  const priorityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const topTasks = [...openTasks]
    .sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3))
    .slice(0, 3);

  const activeGoals = goals.filter((g) => g.status === "active");
  const activeProjects = projects.filter((p) => p._count.tasks > 0);

  const habitsWithStatus = await Promise.all(
    habits.map(async (h) => {
      const completed = await isHabitCompletedForToday(prisma, h.id, h.frequency);
      const streak = completed
        ? await calculateHabitStreak(prisma, h.id, h.frequency)
        : 0;
      return {
        id: h.id,
        title: h.title,
        frequency: h.frequency,
        todayCompleted: completed,
        currentStreak: streak,
      };
    }),
  );

  const completedCount = habitsWithStatus.filter((h) => h.todayCompleted).length;

  // Calculate overall consistency score
  const activeHabitIds = habits.map((h) => h.id);
  const completions = activeHabitIds.length > 0
    ? await prisma.habitCompletion.findMany({
        where: { habitId: { in: activeHabitIds } },
        orderBy: { periodStart: "asc" },
      })
    : [];

  const completedDates = new Set<string>();
  const habitCompletionDates = new Map<string, Set<string>>();

  for (const c of completions) {
    const dStr = new Date(c.periodStart).toISOString().slice(0, 10);
    completedDates.add(dStr);
    if (!habitCompletionDates.has(c.habitId)) {
      habitCompletionDates.set(c.habitId, new Set());
    }
    habitCompletionDates.get(c.habitId)!.add(dStr);
  }

  const sortedDates = Array.from(completedDates)
    .map((d) => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());

  let overallLongestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const date of sortedDates) {
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffTime = date.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / 86400000);
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    if (tempStreak > overallLongestStreak) overallLongestStreak = tempStreak;
    prevDate = date;
  }

  const todayKey = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  let overallCurrentStreak = 0;
  if (completedDates.has(todayKey) || completedDates.has(yesterdayKey)) {
    let checkDate = completedDates.has(todayKey) ? new Date(now) : yesterday;
    overallCurrentStreak = 1;
    while (true) {
      const check = new Date(checkDate);
      check.setDate(check.getDate() - 1);
      const checkKey = check.toISOString().slice(0, 10);
      if (completedDates.has(checkKey)) {
        overallCurrentStreak++;
        checkDate = check;
      } else {
        break;
      }
    }
  }

  let sumRate = 0;
  for (const h of habits) {
    const dates = habitCompletionDates.get(h.id) || new Set();
    const createdDate = new Date(h.createdAt);
    const daysSinceCreation = Math.max(1, Math.ceil((now.getTime() - createdDate.getTime()) / 86400000));
    const rate = Math.min(100, Math.round((dates.size / daysSinceCreation) * 100));
    sumRate += rate;
  }
  const averageCompletionRate = habits.length > 0 ? Math.round(sumRate / habits.length) : 0;

  let last7DaysCompletions = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dKey = d.toISOString().slice(0, 10);
    if (completedDates.has(dKey)) {
      last7DaysCompletions++;
    }
  }

  const overallStreakPoints = Math.min(30, overallCurrentStreak);
  const overallRatePoints = Math.round(averageCompletionRate * 0.4);
  const overallWeeklyPoints = Math.round((last7DaysCompletions / 7) * 30);
  const consistencyScore = Math.min(100, Math.max(0, overallStreakPoints + overallRatePoints + overallWeeklyPoints));

  const [recentTasks, recentHabitCompletions, recentNotes] = await Promise.all([
    prisma.task.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { title: true, status: true, updatedAt: true, createdAt: true },
    }),
    prisma.habitCompletion.findMany({
      where: { habit: { userId } },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: { completedAt: true, habit: { select: { title: true } } },
    }),
    prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { title: true, updatedAt: true, createdAt: true },
    }),
  ]);

  const activityFeed: { action: string; title: string; timestamp: string }[] = [];

  for (const t of recentTasks) {
    const isNew = Math.abs(new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()) < 5000;
    activityFeed.push({
      action: isNew ? "Task created" : `Task updated (${t.status})`,
      title: t.title,
      timestamp: t.updatedAt.toISOString(),
    });
  }

  for (const c of recentHabitCompletions) {
    activityFeed.push({
      action: "Habit completed",
      title: c.habit.title,
      timestamp: c.completedAt.toISOString(),
    });
  }

  for (const n of recentNotes) {
    const isNew = Math.abs(new Date(n.updatedAt).getTime() - new Date(n.createdAt).getTime()) < 5000;
    activityFeed.push({
      action: isNew ? "Note created" : "Note updated",
      title: n.title,
      timestamp: n.updatedAt.toISOString(),
    });
  }

  activityFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const recentActivity = activityFeed.slice(0, 10);

  let aiSuggestion: string | null = null;
  try {
    const context = {
      consistencyScore,
      tasks: openTasks.slice(0, 5).map((t) => ({
        title: t.title,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate?.toISOString() || null,
      })),
      goals: activeGoals.slice(0, 3).map((g) => ({
        title: g.title,
        progress: g.progress,
      })),
      habits: habitsWithStatus.map((h) => ({
        title: h.title,
        todayCompleted: h.todayCompleted,
        streak: h.currentStreak,
      })),
      projects: activeProjects.slice(0, 3).map((p) => ({
        name: p.name,
        taskCount: p._count.tasks,
      })),
    };

    const completion = await nvidia.chatCompletion(
      [
        {
          role: "system",
          content:
            "You are a productivity assistant. Based on the user's current state and habit consistencyScore (out of 100), recommend ONE specific next action they should take or comment on their consistency. Be concise (1-2 sentences).",
        },
        { role: "user", content: JSON.stringify(context) },
      ],
      { temperature: 0.7, maxTokens: 200 },
    );

    aiSuggestion = completion.choices[0]?.message?.content || null;
  } catch {
    aiSuggestion = null;
  }

  return {
    greeting: getGreeting(),
    firstName,
    date: now.toISOString().slice(0, 10),
    stats: {
      tasks: openTasks.length,
      habits: habits.length,
      projects: activeProjects.length,
      goals: activeGoals.length,
    },
    tasks: {
      open: openTasks.length,
      overdue: overdueTasks.length,
      topTasks: topTasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate?.toISOString() || null,
      })),
    },
    habits: {
      completed: completedCount,
      total: habits.length,
      habits: habitsWithStatus,
      consistencyScore,
    },
    projects: {
      active: activeProjects.length,
      projects: activeProjects.map((p) => ({
        id: p.id,
        name: p.name,
        taskCount: p._count.tasks,
        color: p.color,
      })),
    },
    recentActivity,
    aiSuggestion,
  };
}
