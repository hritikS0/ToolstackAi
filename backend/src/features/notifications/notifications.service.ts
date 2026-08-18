import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { createAndSendNotification } from "../../shared/socket/socketManager.js";

export async function getUserNotifications(userId: string, limit: number = 30) {
  const prisma = getPrismaClient();
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markAsRead(userId: string, notificationId: string) {
  const prisma = getPrismaClient();
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  const prisma = getPrismaClient();
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function clearNotifications(userId: string) {
  const prisma = getPrismaClient();
  return prisma.notification.deleteMany({
    where: { userId },
  });
}

export async function checkDueTaskAndHabitReminders() {
  const prisma = getPrismaClient();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  try {
    // 1. Check Tasks due today that are not completed
    const dueTasks = await prisma.task.findMany({
      where: {
        dueDate: { gte: startOfDay, lte: endOfDay },
        status: { not: "completed" },
      },
    });

    for (const task of dueTasks) {
      // Check if notification sent today
      const existing = await prisma.notification.findFirst({
        where: {
          userId: task.userId,
          type: "task",
          link: "/tasks",
          message: { contains: task.title },
          createdAt: { gte: startOfDay },
        },
      });

      if (!existing) {
        await createAndSendNotification(task.userId, {
          type: "task",
          title: "Task Due Today 📋",
          message: `"${task.title}" is due today.`,
          link: "/tasks",
        });
      }
    }

    // 2. Check Active Habits not completed today
    const activeHabits = await prisma.habit.findMany({
      where: { active: true },
      include: {
        completions: {
          where: { periodStart: { gte: startOfDay, lte: endOfDay } },
        },
      },
    });

    for (const habit of activeHabits) {
      if (habit.completions.length === 0) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: habit.userId,
            type: "habit",
            link: "/habits",
            message: { contains: habit.title },
            createdAt: { gte: startOfDay },
          },
        });

        if (!existing) {
          await createAndSendNotification(habit.userId, {
            type: "habit",
            title: "Habit Streak Reminder 🔥",
            message: `Don't break your streak! Complete "${habit.title}" today.`,
            link: "/habits",
          });
        }
      }
    }
  } catch (error) {
    console.error("Error checking due tasks & habit reminders:", error);
  }
}
