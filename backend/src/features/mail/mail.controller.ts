import type { Request, Response, NextFunction } from "express";
import * as mailService from "./mail.service.js";
import * as mailAiService from "./mail-ai.service.js";

export async function createAccountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const account = await mailService.createEmailAccount(userId, req.body);
    res.status(201).json({ success: true, account });
  } catch (error) {
    next(error);
  }
}

export async function getAccountsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const accounts = await mailService.getUserEmailAccounts(userId);
    res.status(200).json({ success: true, accounts });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const id = String(req.params.id);
    await mailService.deleteEmailAccount(userId, id);
    res.status(200).json({ success: true, message: "Account deleted" });
  } catch (error) {
    next(error);
  }
}

export async function testConnectionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mailService.testConnection(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function syncAccountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const id = String(req.params.id);
    const result = await mailService.syncEmailAccount(userId, id, req.body?.limit || 20);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getThreadsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const { accountId, category, search } = req.query as Record<string, string>;
    const threads = await mailService.getThreads(userId, { accountId, category, search });
    res.status(200).json({ success: true, threads });
  } catch (error) {
    next(error);
  }
}

export async function getThreadDetailsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const id = String(req.params.id);
    const thread = await mailService.getThreadDetails(userId, id);
    if (!thread) {
      return res.status(404).json({ success: false, message: "Thread not found" });
    }
    res.status(200).json({ success: true, thread });
  } catch (error) {
    next(error);
  }
}

export async function categorizeThreadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const id = String(req.params.id);
    const thread = await mailAiService.categorizeThread(userId, id);
    res.status(200).json({ success: true, thread });
  } catch (error) {
    next(error);
  }
}

export async function categorizeAllHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const result = await mailAiService.categorizeAllThreads(userId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function generateDraftHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const { threadId, preset, tone, formatType, userInstruction, includeWorkspaceContext } = req.body;
    const draft = await mailAiService.generateDraftReply(userId, {
      threadId,
      preset,
      tone,
      formatType,
      userInstruction,
      includeWorkspaceContext,
    });
    res.status(200).json({ success: true, draft });
  } catch (error) {
    next(error);
  }
}

export async function sendEmailHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const result = await mailService.sendEmail(userId, req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
