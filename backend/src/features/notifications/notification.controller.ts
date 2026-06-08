import { Request, Response, NextFunction } from "express";
import { updateNotificationPreferencesSchema } from "./notification.validator.js";
import * as notificationService from "./notification.service.js";

export async function getPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const prefs = await notificationService.getOrCreatePreferences(userId);
    res.json({ success: true, data: prefs });
  } catch (err) {
    next(err);
  }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const data = updateNotificationPreferencesSchema.parse(req.body);
    const prefs = await notificationService.updatePreferences(userId, data);
    res.json({ success: true, data: prefs });
  } catch (err) {
    next(err);
  }
}

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const notifications = await notificationService.getNotifications(userId);
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
}

export async function getNotificationCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const count = await notificationService.getNotificationCount(userId);
    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    await notificationService.markAsRead(id, userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    await notificationService.markAllAsRead(userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function clearRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    await notificationService.clearRead(userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
