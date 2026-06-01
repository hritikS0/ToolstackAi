import { Request, Response, NextFunction } from "express";
import * as mediaService from "./media.service.js";

export async function getMedia(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const media = await mediaService.getMedia(userId);
    res.json({ success: true, data: media });
  } catch (err) {
    next(err);
  }
}

export async function serveMediaFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const url = await mediaService.getMediaSignedUrl(id, userId);
    if (!url) return res.status(404).json({ success: false, message: "File not found" });

    res.redirect(url);
  } catch (err) {
    next(err);
  }
}

export async function deleteMedia(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    await mediaService.deleteMedia(id, userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
