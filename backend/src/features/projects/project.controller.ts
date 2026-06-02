import { Request, Response, NextFunction } from "express";
import * as service from "./project.service.js";

function uid(req: Request) {
  return req.user?.id as string;
}

export async function listProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getProjects(uid(req));
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getProject(req.params.id, uid(req));
    if (!data) return res.status(404).json({ success: false, message: "Project not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.createProject(uid(req), req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    await service.updateProject(req.params.id, uid(req), req.body);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteProject(req.params.id, uid(req));
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function listThreads(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getThreads(req.params.projectId, uid(req));
    if (!data) return res.status(404).json({ success: false, message: "Project not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getThread(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getThread(req.params.id, uid(req));
    if (!data) return res.status(404).json({ success: false, message: "Thread not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createThread(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.createThread(uid(req), req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateThread(req: Request, res: Response, next: NextFunction) {
  try {
    await service.updateThread(req.params.id, uid(req), req.body);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function deleteThread(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteThread(req.params.id, uid(req));
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function linkConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.linkConversationToThread(req.body.conversationId, req.body.threadId, uid(req));
    if (!data) return res.status(404).json({ success: false, message: "Thread or conversation not found" });
    res.json({ success: true });
  } catch (err) { next(err); }
}
