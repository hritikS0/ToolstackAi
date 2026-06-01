import { Request, Response, NextFunction } from "express";
import { debugSchema } from "./debug.validator.js";
import { debugCodeService } from "./debug.service.js";

export async function debugCode(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { code, language } = debugSchema.parse(req.body);
    const result = await debugCodeService(code, language, userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
