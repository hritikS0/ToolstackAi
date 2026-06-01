import { Request, Response, NextFunction } from "express";
import * as filesService from "./files.service.js";
import { pdfUpload, imageUpload } from "../../shared/utils/multer.js";

export async function getFiles(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const files = await filesService.getFiles(userId, type);
    res.json({ success: true, data: files });
  } catch (err) {
    next(err);
  }
}

export async function uploadFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const { bucket, type } = req.body;
    const b = (typeof bucket === "string" ? bucket : "images") as string;
    const t = (typeof type === "string" ? type : "image") as string;

    const file = await filesService.uploadAndSave(req.file, userId, b, t);
    res.status(201).json({ success: true, data: file });
  } catch (err) {
    next(err);
  }
}

export async function getFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const file = await filesService.getFileById(id, userId);
    res.json({ success: true, data: file });
  } catch (err) {
    next(err);
  }
}

export async function deleteFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    await filesService.deleteStoredFile(id, userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
