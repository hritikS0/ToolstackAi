import { z } from "zod";

export const providers = ["nvidia", "openai", "anthropic", "openrouter", "deepseek", "gemini"] as const;

export const createKeySchema = z.object({
  provider: z.enum(providers),
  key: z.string().min(1, "API key is required"),
});

export const testKeySchema = z.object({
  provider: z.enum(providers),
});
