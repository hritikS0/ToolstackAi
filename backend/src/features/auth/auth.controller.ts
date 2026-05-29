import { Request, Response, NextFunction } from "express";
import { registerSchema, loginSchema } from "./auth.validator.js";
import { registerUser, loginUser } from "./auth.service.js";

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
