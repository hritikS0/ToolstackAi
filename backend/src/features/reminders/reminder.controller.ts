import { Request, Response, NextFunction } from "express";
import { createReminderSchema, updateReminderSchema } from "./reminder.validator.js";
import * as reminderService from "./reminder.service.js";

export async function getReminders(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const reminders = await reminderService.getReminders(userId);
    res.json({ success: true, data: reminders });
  } catch (err) { next(err); }
}

export async function createReminder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const data = createReminderSchema.parse(req.body);
    const reminder = await reminderService.createReminder(userId, data);
    res.status(201).json({ success: true, data: reminder });
  } catch (err) { next(err); }
}

export async function updateReminder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const data = updateReminderSchema.parse(req.body);
    const reminder = await reminderService.updateReminder(id, userId, data);
    res.json({ success: true, data: reminder });
  } catch (err) { next(err); }
}

export async function deleteReminder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    await reminderService.deleteReminder(id, userId);
    res.json({ success: true });
  } catch (err) { next(err); }
}
