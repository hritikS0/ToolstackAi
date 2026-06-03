import { Request, Response, NextFunction } from "express";
import { createTaskSchema, updateTaskSchema, taskIdSchema } from "./tasks.validator.js";
import {
  createTask as createTaskService,
  getTasks as getTasksService,
  getTask as getTaskService,
  updateTask as updateTaskService,
  deleteTask as deleteTaskService,
  aiCreateTask as aiCreateTaskService,
  aiSuggestPriorities as aiSuggestPrioritiesService,
} from "./tasks.service.js";

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createTaskSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const task = await createTaskService(userId, data);
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
}

export async function getTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { status, priority, projectId } = req.query as Record<string, string | undefined>;
    const tasks = await getTasksService(userId, { status, priority, projectId });
    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { id } = taskIdSchema.parse(req.params);
    const task = await getTaskService(userId, id);
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { id } = taskIdSchema.parse(req.params);
    const data = updateTaskSchema.parse(req.body);
    const task = await updateTaskService(userId, id, data);
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { id } = taskIdSchema.parse(req.params);
    await deleteTaskService(userId, id);
    res.status(200).json({ success: true, message: "Task deleted" });
  } catch (error) {
    next(error);
  }
}

export async function aiCreateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: "Message is required" });
    const task = await aiCreateTaskService(userId, message);
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
}

export async function aiSuggestPriorities(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const suggestions = await aiSuggestPrioritiesService(userId);
    res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    next(error);
  }
}
