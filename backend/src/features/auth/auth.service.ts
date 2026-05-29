import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getPrismaClient } from "../../shared/db/prismaClient.js";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const SALT_ROUNDS = 10;

export async function registerUser(email: string, password: string , fullName : string) {
  const prisma = getPrismaClient();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw Object.assign(new Error("Email already registered"), { statusCode: 409 });
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, password: hashed , fullName },
  });

  const token = jwt.sign({ userId: user.id, email: user.email , fullName : user.fullName}, JWT_SECRET, {
    expiresIn: "7d",
  });

  return { token, user: { id: user.id,fullName : user.fullName,  email: user.email, createdAt: user.createdAt } };
}

export async function loginUser(email: string, password: string) {
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw Object.assign(new Error("Invalid email or password"), { statusCode: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw Object.assign(new Error("Invalid email or password"), { statusCode: 401 });
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return { token, user: { id: user.id, email: user.email, createdAt: user.createdAt } };
}
