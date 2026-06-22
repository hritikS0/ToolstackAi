import { Request, Response, NextFunction } from "express";
import { conversationSchema } from "./conversation.validator.js";
import { conversationService, getConversations as getConversationsService, deleteConversation as deleteConversationService, updateConversation as updateConversationService } from "./conversation.service.js";

export async function createConversation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { title } = conversationSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const newConversation = await conversationService(title || "", userId);
    res.status(201).json({ success: true, data: newConversation });
  } catch (error) {
    next(error);
  }
}

export async function getConversations(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const result = await getConversationsService(userId, limit, offset);
    res.status(200).json({ success: true, data: result.conversations, total: result.total, hasMore: result.hasMore });
  } catch (error) {
    next(error);
  }
}

export async function deleteConversation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = req.params.id as string;
    await deleteConversationService(id, userId);
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    next(error);
  }
}

export async function updateConversation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = req.params.id as string;
    const { title, settings } = req.body;
    const updated = await updateConversationService(id, userId, { title, settings });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}
