import { Request, Response, NextFunction } from "express";
import { createHabitSchema, updateHabitSchema } from "./habits.validator.js";
import * as habitsService from "./habits.service.js";

export async function createHabit(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const data = createHabitSchema.parse(req.body);
    const habit = await habitsService.createHabit(userId, data);
    res.status(201).json({ success: true, data: habit });
  } catch (err) {
    next(err);
  }
}

export async function getHabits(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const habits = await habitsService.getHabits(userId, projectId);
    res.json({ success: true, data: habits });
  } catch (err) {
    next(err);
  }
}

export async function getHabitStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const stats = await habitsService.getHabitStats(userId, id);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

export async function updateHabit(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const data = updateHabitSchema.parse(req.body);
    const habit = await habitsService.updateHabit(userId, id, data);
    res.json({ success: true, data: habit });
  } catch (err) {
    next(err);
  }
}

export async function deleteHabit(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    await habitsService.deleteHabit(userId, id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function completeHabit(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const completion = await habitsService.completeHabit(userId, id);
    res.status(201).json({ success: true, data: completion });
  } catch (err) {
    next(err);
  }
}

export async function aiCreateHabit(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ success: false, message: "Message is required" });
    }
    const habit = await habitsService.aiCreateHabit(userId, message);
    res.status(201).json({ success: true, data: habit });
  } catch (err) {
    next(err);
  }
}

export async function aiAnalyzeHabits(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const result = await habitsService.aiAnalyzeHabits(userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
