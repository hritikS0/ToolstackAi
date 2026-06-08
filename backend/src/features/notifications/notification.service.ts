import { getPrismaClient } from "../../shared/db/prismaClient.js";
import type { UpdateNotificationPreferencesInput } from "./notification.validator.js";

export async function getOrCreatePreferences(userId: string) {
  const prisma = getPrismaClient();
  let prefs = await prisma.notificationPreferences.findUnique({ where: { userId } });
  if (!prefs) {
    prefs = await prisma.notificationPreferences.create({
      data: { userId },
    });
  }
  return prefs;
}

export async function updatePreferences(
  userId: string,
  data: UpdateNotificationPreferencesInput,
) {
  const prisma = getPrismaClient();
  await getOrCreatePreferences(userId);
  return prisma.notificationPreferences.update({ where: { userId }, data });
}

export async function generateNotifications(userId: string) {
  const prisma = getPrismaClient();
  const prefs = await getOrCreatePreferences(userId);
  if (!prefs.enabled) return [];

  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const created: unknown[] = [];

  const existingRefs = new Map<string, string>();
  const existing = await prisma.notification.findMany({
    where: { userId },
    select: { type: true, refId: true, id: true },
  });
  for (const n of existing) {
    if (n.refId) existingRefs.set(`${n.type}:${n.refId}`, n.id);
  }

  if (prefs.taskNotifications) {
    const tasks = await prisma.task.findMany({
      where: { userId, status: { notIn: ['done', 'archived'] }, dueDate: { not: null } },
    });

    for (const task of tasks) {
      const due = new Date(task.dueDate!);

      if (due < now) {
        const key = `task:${task.id}:overdue`;
        const existingKey = existingRefs.get(`task:${task.id}`);
        if (!existingKey || existingKey !== key) {
          await prisma.notification.create({
            data: {
              userId,
              type: 'task',
              title: 'Task Overdue',
              message: `"${task.title}" is past its due date`,
              refId: task.id,
              link: '/tasks',
            },
          });
          existingRefs.set(`task:${task.id}`, key);
          created.push(task.id);
        }
      } else if (due <= oneHourFromNow) {
        const key = `task:${task.id}:due_soon`;
        const existingKey = existingRefs.get(`task:${task.id}`);
        if (!existingKey || existingKey !== key) {
          await prisma.notification.create({
            data: {
              userId,
              type: 'task',
              title: 'Task Due Soon',
              message: `"${task.title}" is due in less than 1 hour`,
              refId: task.id,
              link: '/tasks',
            },
          });
          existingRefs.set(`task:${task.id}`, key);
          created.push(task.id);
        }
      }
    }
  }

  if (prefs.goalNotifications) {
    const goals = await prisma.goal.findMany({
      where: { userId, status: 'active', targetDate: { not: null } },
    });

    for (const goal of goals) {
      const target = new Date(goal.targetDate!);
      if (target <= twentyFourHoursFromNow && target > now) {
        const key = `goal:${goal.id}:deadline`;
        if (!existingRefs.has(key)) {
          await prisma.notification.create({
            data: {
              userId,
              type: 'goal',
              title: 'Goal Deadline Approaching',
              message: `"${goal.title}" deadline is within 24 hours (${Math.round(goal.progress)}% complete)`,
              refId: goal.id,
              link: '/goals',
            },
          });
          existingRefs.set(key, goal.id);
          created.push(goal.id);
        }
      }
    }

    const completedGoals = await prisma.goal.findMany({
      where: { userId, status: 'completed', updatedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    });

    for (const goal of completedGoals) {
      const key = `goal:${goal.id}:completed`;
      if (!existingRefs.has(key)) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'goal',
            title: 'Goal Completed',
            message: `"${goal.title}" has been marked as complete`,
            refId: goal.id,
            link: '/goals',
          },
        });
        existingRefs.set(key, goal.id);
        created.push(goal.id);
      }
    }
  }

  if (prefs.habitNotifications) {
    const habits = await prisma.habit.findMany({
      where: { userId, active: true },
      include: {
        completions: {
          where: { periodStart: startOfToday },
          take: 1,
        },
      },
    });

    for (const habit of habits) {
      if (habit.completions.length === 0) {
        const key = `habit:${habit.id}:reminder`;
        if (!existingRefs.has(key)) {
          const completions = await prisma.habitCompletion.findMany({
            where: { habitId: habit.id },
            orderBy: { completedAt: 'desc' },
            take: 30,
          });

          const uniqueDays = new Set<string>();
          for (const c of completions) {
            uniqueDays.add(c.completedAt.toISOString().slice(0, 10));
          }
          const sorted = [...uniqueDays].sort().reverse();

          let streak = 0;
          let check = new Date(startOfToday);
          check.setDate(check.getDate() - 1);

          for (const day of sorted) {
            const expected = check.toISOString().slice(0, 10);
            if (day === expected) {
              streak++;
              check.setDate(check.getDate() - 1);
            } else {
              break;
            }
          }

          if (streak > 0) {
            await prisma.notification.create({
              data: {
                userId,
                type: 'habit',
                title: 'Streak at Risk',
                message: `Don't lose your ${streak}-day streak on "${habit.title}"`,
                refId: habit.id,
                link: '/habits',
              },
            });
            existingRefs.set(key, habit.id);
            created.push(habit.id);
          }
        }
      }
    }
  }

  return created;
}

export async function getNotifications(userId: string) {
  const prisma = getPrismaClient();
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function getNotificationCount(userId: string) {
  const prisma = getPrismaClient();
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function markAsRead(id: string, userId: string) {
  const prisma = getPrismaClient();
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
}

export async function markAllAsRead(userId: string) {
  const prisma = getPrismaClient();
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function clearRead(userId: string) {
  const prisma = getPrismaClient();
  return prisma.notification.deleteMany({
    where: { userId, read: true },
  });
}
