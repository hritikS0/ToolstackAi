import { Request, Response, NextFunction } from "express";
import { analyzeImageService } from "./image.service.js";

export async function analyzeImage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const result = await analyzeImageService(req.file, userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
