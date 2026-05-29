import { Request, Response, NextFunction } from "express";
import { messageSchema  } from "./conversation.validator.js";

import { createMessageService ,getMessageService} from "./message.service.js";
export async function createMessage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { message, conversationId } = messageSchema.parse(req.body);

    const newMessage = await createMessageService(
      message,
      conversationId,
      "user",
    );
    res.status(200).json({ success: true, data: newMessage });
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
      return res.status(400).json({ success: false, message: "conversationId is required as a query parameter" });
    }
    const messages = await getMessageService(conversationId);
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
}
