import { getPrismaClient } from "../../shared/db/prismaClient.js";
import type { CreateReminderInput, UpdateReminderInput } from "./reminder.validator.js";

function calculateNextRunAt(remindAt: Date, frequency: string): Date {
  if (frequency === "once") return remindAt;
  const next = new Date(remindAt);
  if (frequency === "daily") next.setDate(next.getDate() + 1);
  if (frequency === "weekly") next.setDate(next.getDate() + 7);
  return next;
}

export async function getReminders(userId: string) {
  const prisma = getPrismaClient();
  return prisma.reminder.findMany({
    where: { userId },
    orderBy: { remindAt: "asc" },
  });
}

export async function createReminder(userId: string, data: CreateReminderInput) {
  const prisma = getPrismaClient();
  const remindAt = new Date(data.remindAt);
  return prisma.reminder.create({
    data: {
      userId,
      title: data.title,
      message: data.message || "",
      remindAt,
      nextRunAt: remindAt,
      frequency: data.frequency || "once",
    },
  });
}

export async function updateReminder(id: string, userId: string, data: UpdateReminderInput) {
  const prisma = getPrismaClient();
  const existing = await prisma.reminder.findFirst({ where: { id, userId } });
  if (!existing) throw Object.assign(new Error("Reminder not found"), { statusCode: 404 });

  const updateData: Record<string, unknown> = { ...data };
  if (data.remindAt) {
    updateData.remindAt = new Date(data.remindAt);
    if (!existing.fired) {
      updateData.nextRunAt = new Date(data.remindAt);
    }
  }

  return prisma.reminder.update({ where: { id }, data: updateData });
}

export async function deleteReminder(id: string, userId: string) {
  const prisma = getPrismaClient();
  const existing = await prisma.reminder.findFirst({ where: { id, userId } });
  if (!existing) throw Object.assign(new Error("Reminder not found"), { statusCode: 404 });
  return prisma.reminder.delete({ where: { id } });
}

export async function getDueReminders() {
  const prisma = getPrismaClient();
  const now = new Date();
  return prisma.reminder.findMany({
    where: {
      enabled: true,
      fired: false,
      nextRunAt: { lte: now },
    },
    include: { user: { select: { id: true } } },
  });
}

export async function markFired(id: string, notified: boolean) {
  const prisma = getPrismaClient();
  const reminder = await prisma.reminder.findUnique({ where: { id } });
  if (!reminder) return;

  const logEntry = {
    timestamp: new Date().toISOString(),
    action: "fired",
    notificationCreated: true,
    browserNotificationSent: notified,
  };

  const logs = Array.isArray(reminder.log) ? reminder.log : [];
  logs.push(logEntry);

  if (reminder.frequency === "once") {
    return prisma.reminder.update({
      where: { id },
      data: { fired: true, notified, log: logs },
    });
  }

  return prisma.reminder.update({
    where: { id },
    data: {
      nextRunAt: calculateNextRunAt(reminder.remindAt, reminder.frequency),
      notified,
      log: logs,
    },
  });
}
