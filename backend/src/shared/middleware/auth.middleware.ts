import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Missing or invalid token" });
    return;
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.user = { id: decoded.userId, email: decoded.email } as any;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}
