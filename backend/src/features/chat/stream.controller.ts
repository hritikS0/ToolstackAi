import { Request, Response, NextFunction } from "express";
import { messageSchema } from "./conversation.validator.js";
import { streamAiResponse } from "./chat-completion.service.js";
import { logger } from "../../shared/utils/logger.js";

export async function streamChatHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Invalid request", errors: parsed.error.issues });
    return;
  }

  const { message, conversationId } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    const stream = streamAiResponse(message, conversationId, userId);

    for await (const chunk of stream) {
      if (res.destroyed) break;
      if (chunk.startsWith("__brain__:")) {
        const saved = parseInt(chunk.slice(10), 10);
        if (saved > 0) {
          res.write(`data: ${JSON.stringify({ type: "brain", saved })}\n\n`);
        }
        continue;
      }
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    if (!res.destroyed) {
      res.write("data: [DONE]\n\n");
    }
  } catch (err) {
    logger.error({ err, conversationId }, "Stream error");
    if (!res.destroyed && !res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
    }
  } finally {
    if (!res.destroyed && !res.writableEnded) {
      res.end();
    }
  }
}
