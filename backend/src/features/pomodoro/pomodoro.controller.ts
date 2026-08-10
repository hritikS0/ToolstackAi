import { Request, Response, NextFunction } from "express";
import { createPomodoroSessionSchema, listPomodoroSessionsSchema } from "./pomodoro.validator.js";
import * as pomodoroService from "./pomodoro.service.js";

export async function createSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const data = createPomodoroSessionSchema.parse(req.body);
    const session = await pomodoroService.createSession(userId, data);
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
}

export async function listSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const query = listPomodoroSessionsSchema.parse(req.query);
    const sessions = await pomodoroService.listSessions(userId, query.limit);
    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
}

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const stats = await pomodoroService.getStats(userId);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}
