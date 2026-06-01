import { Request, Response, NextFunction } from "express";
import {
  createMemorySchema,
  updateMemorySchema,
  memoryQuerySchema,
  updateBrainSettingsSchema,
} from "./brain.validator.js";
import * as brainService from "./brain.service.js";

export async function getMemories(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const params = memoryQuerySchema.parse(req.query);
    const memories = await brainService.getMemories(userId, params);
    res.json({ success: true, data: memories });
  } catch (err) {
    next(err);
  }
}

export async function getMemory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const memory = await brainService.getMemoryById(id, userId);
    res.json({ success: true, data: memory });
  } catch (err) {
    next(err);
  }
}

export async function createMemory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const data = createMemorySchema.parse(req.body);
    const memory = await brainService.createMemory(userId, data);
    res.status(201).json({ success: true, data: memory });
  } catch (err) {
    next(err);
  }
}

export async function updateMemory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const data = updateMemorySchema.parse(req.body);
    const memory = await brainService.updateMemory(id, userId, data);
    res.json({ success: true, data: memory });
  } catch (err) {
    next(err);
  }
}

export async function deleteMemory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    await brainService.deleteMemory(id, userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const dashboard = await brainService.getDashboard(userId);
    res.json({ success: true, data: dashboard });
  } catch (err) {
    next(err);
  }
}

export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const settings = await brainService.getOrCreateSettings(userId);
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const data = updateBrainSettingsSchema.parse(req.body);
    const settings = await brainService.updateSettings(userId, data);
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

export async function deleteAllMemories(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    await brainService.deleteAllMemories(userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
