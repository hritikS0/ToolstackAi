import { Request, Response, NextFunction } from "express";
import { messageSchema } from "./conversation.validator.js";
import { createMessageService, getMessageService } from "./message.service.js";
import { generateAiResponse } from "./chat-completion.service.js";
import { logger } from "../../shared/utils/logger.js";

export async function createMessage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { message, conversationId, tools } = messageSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const result = await generateAiResponse(message, conversationId, userId, tools);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getMessage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const conversationId = req.query.conversationId as string;
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "conversationId is required as a query parameter",
      });
    }
    const messages = await getMessageService(conversationId);
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
}
