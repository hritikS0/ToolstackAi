import { Request, Response, NextFunction } from "express";
import { getDashboard } from "./dashboard.service.js";

export async function getDashboardHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const data = await getDashboard(userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
