import type { Request, Response, NextFunction } from "express";
import * as notificationsService from "./notifications.service.js";

export async function getNotificationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const notifications = await notificationsService.getUserNotifications(userId);
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    next(error);
  }
}

export async function markAsReadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const id = String(req.params.id);
    await notificationsService.markAsRead(userId, id);
    res.status(200).json({ success: true, message: "Marked as read" });
  } catch (error) {
    next(error);
  }
}

export async function markAllAsReadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    await notificationsService.markAllAsRead(userId);
    res.status(200).json({ success: true, message: "All marked as read" });
  } catch (error) {
    next(error);
  }
}

export async function clearNotificationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    await notificationsService.clearNotifications(userId);
    res.status(200).json({ success: true, message: "Notifications cleared" });
  } catch (error) {
    next(error);
  }
}
