import { Request, Response, NextFunction } from "express";
import { createKeySchema, testKeySchema } from "./api-keys.validator.js";
import * as keysService from "./api-keys.service.js";

export async function getKeys(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const keys = await keysService.getKeys(userId);
    res.json({ success: true, data: keys });
  } catch (err) {
    next(err);
  }
}

export async function saveKey(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { provider, key } = createKeySchema.parse(req.body);
    await keysService.saveKey(userId, provider, key);
    const keys = await keysService.getKeys(userId);
    res.json({ success: true, data: keys });
  } catch (err) {
    next(err);
  }
}

export async function deleteKey(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const provider = typeof req.params.provider === "string" ? req.params.provider : req.params.provider[0];
    await keysService.deleteKey(userId, provider);
    const keys = await keysService.getKeys(userId);
    res.json({ success: true, data: keys });
  } catch (err) {
    next(err);
  }
}

export async function testKey(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { provider } = testKeySchema.parse(req.body);
    const result = await keysService.testKey(userId, provider);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
