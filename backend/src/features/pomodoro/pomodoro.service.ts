import { getPrismaClient } from "../../shared/db/prismaClient.js";

export async function createSession(
  userId: string,
  data: { mode: string; startedAt: string; completedAt: string; durationSeconds: number },
) {
  const prisma = getPrismaClient();
  return prisma.pomodoroSession.create({
    data: {
      userId,
      mode: data.mode,
      startedAt: new Date(data.startedAt),
      completedAt: new Date(data.completedAt),
      durationSeconds: data.durationSeconds,
    },
  });
}

export async function listSessions(userId: string, limit?: number) {
  const prisma = getPrismaClient();
  return prisma.pomodoroSession.findMany({
    where: { userId },
    orderBy: { completedAt: "desc" },
    take: limit ?? 100,
  });
}

export async function getStats(userId: string) {
  const prisma = getPrismaClient();
  const sessions = await prisma.pomodoroSession.findMany({
    where: { userId, mode: "focus" },
    orderBy: { completedAt: "asc" },
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let todayFocusSeconds = 0;
  let todaySessions = 0;

  const dailyFocusSeconds = new Map<string, number>();

  for (const s of sessions) {
    const dayKey = s.completedAt.toISOString().slice(0, 10);
    dailyFocusSeconds.set(dayKey, (dailyFocusSeconds.get(dayKey) || 0) + s.durationSeconds);

    if (s.completedAt >= startOfToday && s.completedAt <= now) {
      todayFocusSeconds += s.durationSeconds;
      todaySessions += 1;
    }
  }

  const last7Days: { date: string; focusSeconds: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    last7Days.push({ date: key, focusSeconds: dailyFocusSeconds.get(key) || 0 });
  }

  const totalFocusSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);

  return {
    totalSessions: sessions.length,
    totalFocusSeconds,
    todaySessions,
    todayFocusSeconds,
    last7Days,
  };
}
