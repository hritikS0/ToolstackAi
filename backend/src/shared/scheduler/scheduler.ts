import cron from "node-cron";
import { getPrismaClient } from "../db/prismaClient.js";
import * as reminderService from "../../features/reminders/reminder.service.js";
import * as notificationService from "../../features/notifications/notification.service.js";
import { logger } from "../utils/logger.js";

let cronJob: cron.ScheduledTask | null = null;

async function generateDailyBriefings() {
  const prisma = getPrismaClient();
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const prefs = await prisma.notificationPreferences.findMany({
    where: {
      dailyBriefingEnabled: true,
      dailyBriefingTime: timeStr,
    },
    select: { userId: true },
  });

  for (const p of prefs) {
    try {
      const [taskCount, habitCount, goalCount, overdueCount] = await Promise.all([
        prisma.task.count({ where: { userId: p.userId, status: { in: ["todo", "in-progress"] } } }),
        prisma.habit.count({ where: { userId: p.userId, active: true } }),
        prisma.goal.count({ where: { userId: p.userId, status: "active" } }),
        prisma.task.count({ where: { userId: p.userId, status: { in: ["todo", "in-progress"] }, dueDate: { lt: now } } }),
      ]);

      let message = `${taskCount} open tasks`;
      if (overdueCount > 0) message += ` · ${overdueCount} overdue`;
      let streakMsg = '';
      if (habitCount > 0) streakMsg = ` · ${habitCount} habits`;
      if (goalCount > 0) streakMsg += ` · ${goalCount} active goals`;

      const existing = await prisma.notification.findFirst({
        where: {
          userId: p.userId,
          type: "system",
          title: "Daily Briefing",
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          },
        },
      });

      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: p.userId,
            type: "system",
            title: "Daily Briefing",
            message: `Good morning. ${message}${streakMsg}.`,
            link: "/dashboard",
          },
        });
        logger.info({ userId: p.userId }, "Daily briefing notification created");
      }
    } catch (err) {
      logger.error({ err, userId: p.userId }, "Daily briefing generation failed");
    }
  }
}

export function startScheduler() {
  if (cronJob) return;

  cronJob = cron.schedule("* * * * *", async () => {
    try {
      const prisma = getPrismaClient();

      const enabledUsers = await prisma.notificationPreferences.findMany({
        where: { enabled: true },
        select: { userId: true },
      });

      for (const u of enabledUsers) {
        try {
          await notificationService.generateNotifications(u.userId);
        } catch (err) {
          logger.error({ err, userId: u.userId }, "Event notification generation failed");
        }
      }

      const dueReminders = await reminderService.getDueReminders();

      for (const reminder of dueReminders) {
        try {
          logger.info({ reminderId: reminder.id, title: reminder.title }, "Reminder fired");

          const notif = await prisma.notification.create({
            data: {
              userId: reminder.userId,
              type: "reminder",
              title: reminder.title,
              message: reminder.message || `Reminder: ${reminder.title}`,
              refId: reminder.id,
              link: "/dashboard",
            },
          });

          logger.info({ notificationId: notif.id, reminderId: reminder.id }, "Notification created for reminder");

          await reminderService.markFired(reminder.id, true);

          logger.info({ reminderId: reminder.id }, "Reminder marked as fired, notification sent");
        } catch (err) {
          logger.error({ err, reminderId: reminder.id }, "Reminder processing failed");
        }
      }

      await generateDailyBriefings();
    } catch (err) {
      logger.error({ err }, "Scheduler tick failed");
    }
  });

  logger.info("Notification scheduler started (every minute)");
}

export function stopScheduler() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info("Notification scheduler stopped");
  }
}
