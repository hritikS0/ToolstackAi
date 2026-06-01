import { Request, Response, NextFunction } from "express";
import { processPdfUpload, answerPdfQuestion, getPdfFilePath } from "./pdf.service.js";
import { getPrismaClient } from "../../shared/db/prismaClient.js";

export async function uploadPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const result = await processPdfUpload(req.file, userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function chatWithPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { message, documentId } = req.body;
    if (!message || !documentId) {
      return res.status(400).json({ success: false, message: "message and documentId are required" });
    }

    const result = await answerPdfQuestion(message, documentId, userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getPdfFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const documentId = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const prisma = getPrismaClient();
    const conv = await prisma.conversation.findUnique({ where: { id: documentId } });
    if (!conv || conv.userId !== userId) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const url = await getPdfFilePath(documentId);
    res.redirect(url);
  } catch (err) {
    next(err);
  }
}
