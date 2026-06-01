import { Request, Response, NextFunction } from "express";
import { visionChat } from "./vision.service.js";

export async function visionChatHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { message, conversationId } = req.body;
    if (!message || !conversationId) {
      return res.status(400).json({ success: false, message: "message and conversationId are required" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image file is required" });
    }

    const result = await visionChat(req.file, message, conversationId, userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
