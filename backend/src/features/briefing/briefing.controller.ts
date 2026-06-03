import { Request, Response, NextFunction } from "express";
import { getBriefing } from "./briefing.service.js";

export async function getBriefingHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const data = await getBriefing(userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
