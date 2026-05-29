import { Request, Response, NextFunction } from "express";
import { coversationSchema } from "./conversation.validator.js";
import { conversationService, getConversations as getConversationsService } from "./conversation.service.js";
export async function createConversation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { title } = coversationSchema.parse(req.body);
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
    const conversations = await getConversationsService(userId);
    res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
}
