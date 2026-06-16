import { Request, Response, NextFunction } from "express";
import { registerSchema, loginSchema, changePasswordSchema } from "./auth.validator.js";
import { registerUser, loginUser, changePassword as changePasswordService, updateProfile as updateProfileService } from "./auth.service.js";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password , fullName } = registerSchema.parse(req.body);
    const result = await registerUser(email, password,fullName);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await loginUser(email, password);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const result = await changePasswordService(userId, currentPassword, newPassword);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { fullName } = registerSchema.partial().parse(req.body);
    // For simplicity, we're only allowing fullName update here. You can extend this to other fields.
    const result = await updateProfileService(userId, { fullName });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }

}