import { PrismaPg } from "@prisma/adapter-pg";
import process from "node:process";
import { PrismaClient } from "../../generated/prisma/client.js";

let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}
