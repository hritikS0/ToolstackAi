import { logger } from "./logger.js";

export class AIError extends Error {
  public statusCode: number;
  public provider: string;
  public originalError?: unknown;

  constructor(message: string, statusCode: number, provider: string, original?: unknown) {
    super(message);
    this.name = "AIError";
    this.statusCode = statusCode;
    this.provider = provider;
    this.originalError = original;
  }
}

export function handleAIError(error: unknown, provider: string): never {
  if (error instanceof AIError) throw error;

  const err = error as Error & { statusCode?: number };
  const statusCode = err.statusCode || 502;
  const message = err.message || "AI provider request failed";

  logger.error({ error, provider, statusCode }, "AI provider error");

  throw new AIError(message, statusCode, provider, error);
}
