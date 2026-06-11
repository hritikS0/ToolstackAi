import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { encrypt, decrypt, maskKey } from "../../shared/utils/encryption.js";
import { logger } from "../../shared/utils/logger.js";

const PROVIDER_BASE_URLS: Record<string, string> = {
  nvidia: "https://integrate.api.nvidia.com/v1/models",
  openai: "https://api.openai.com/v1/models",
  anthropic: "https://api.anthropic.com/v1/messages",
  openrouter: "https://openrouter.ai/api/v1/models",
  deepseek: "https://api.deepseek.com/v1/models",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models",
};

const PROVIDER_AUTH_HEADERS: Record<string, (key: string) => Record<string, string>> = {
  nvidia: (key) => ({ Authorization: `Bearer ${key}` }),
  openai: (key) => ({ Authorization: `Bearer ${key}` }),
  anthropic: (key) => ({ "x-api-key": key, "anthropic-version": "2023-06-01" }),
  openrouter: (key) => ({ Authorization: `Bearer ${key}` }),
  deepseek: (key) => ({ Authorization: `Bearer ${key}` }),
  gemini: (key) => ({ "x-goog-api-key": key }),
};

export async function hasKeys(userId: string) {
  const prisma = getPrismaClient();
  const count = await prisma.userApiKey.count({ where: { userId, isActive: true } });
  return count > 0;
}

export async function getKeys(userId: string) {
  const prisma = getPrismaClient();
  const keys = await prisma.userApiKey.findMany({ where: { userId } });
  return keys.map((k) => ({
    id: k.id,
    provider: k.provider,
    maskedKey: maskKey(k.encryptedKey),
    isActive: k.isActive,
    createdAt: k.createdAt,
  }));
}

export async function saveKey(userId: string, provider: string, key: string) {
  const prisma = getPrismaClient();
  const encryptedKey = encrypt(key);

  const existing = await prisma.userApiKey.findUnique({
    where: { userId_provider: { userId, provider } },
  });

  if (existing) {
    return prisma.userApiKey.update({
      where: { id: existing.id },
      data: { encryptedKey, isActive: true },
    });
  }

  return prisma.userApiKey.create({
    data: { userId, provider, encryptedKey },
  });
}

export async function deleteKey(userId: string, provider: string) {
  const prisma = getPrismaClient();
  const existing = await prisma.userApiKey.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!existing) {
    throw Object.assign(new Error("No key found for this provider"), { statusCode: 404 });
  }
  await prisma.userApiKey.delete({ where: { id: existing.id } });
}

export async function testKey(userId: string, provider: string): Promise<{ ok: boolean; message: string }> {
  const prisma = getPrismaClient();
  const record = await prisma.userApiKey.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!record) return { ok: false, message: "No key configured" };

  let apiKey: string;
  try {
    apiKey = decrypt(record.encryptedKey);
  } catch {
    return { ok: false, message: "Failed to decrypt key" };
  }

  const url = PROVIDER_BASE_URLS[provider];
  if (!url) return { ok: false, message: "Unknown provider" };

  try {
    const headers = PROVIDER_AUTH_HEADERS[provider](apiKey);
    const res = await fetch(url, { method: "GET", headers, signal: AbortSignal.timeout(10000) });
    if (res.ok) return { ok: true, message: "Connection successful" };
    return { ok: false, message: `Provider returned ${res.status}` };
  } catch {
    return { ok: false, message: "Connection failed" };
  }
}

export async function getUserKey(userId: string, provider: string): Promise<string | null> {
  const prisma = getPrismaClient();
  const record = await prisma.userApiKey.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!record || !record.isActive) return null;

  try {
    return decrypt(record.encryptedKey);
  } catch {
    return null;
  }
}

export async function getActiveProvider(userId: string): Promise<{ key: string | null; provider: string }> {
  const prisma = getPrismaClient();
  const record = await prisma.userApiKey.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!record) return { key: null, provider: "nvidia" };
  try {
    return { key: decrypt(record.encryptedKey), provider: record.provider };
  } catch {
    return { key: null, provider: "nvidia" };
  }
}

export async function trackUsage(data: {
  userId: string;
  provider: string;
  model: string;
  tokens: number;
  cost: number;
}) {
  const prisma = getPrismaClient();
  try {
    await prisma.usageRecord.create({ data });
  } catch (err) {
    logger.error({ err, userId: data.userId }, "Failed to track usage");
  }
}
