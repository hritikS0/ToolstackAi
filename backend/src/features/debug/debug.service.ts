import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { nvidia } from "../../ai/providers/nvidia.js";
import { codeDebuggerPrompt } from "../../ai/prompts/prompts.js";
import { handleAIError } from "../../shared/utils/ai-error-handler.js";
import { logger } from "../../shared/utils/logger.js";
import { getUserKey } from "../api-keys/api-keys.service.js";

async function getUserApiKey(userId: string): Promise<string | null> {
  return getUserKey(userId, "nvidia");
}

interface DebugResult {
  summary: string;
  bugs: {
    line: number;
    severity: "low" | "medium" | "high";
    description: string;
    explanation: string;
    fix: string;
  }[];
  fixes: string[];
  optimizedCode: string;
}

export async function debugCodeService(
  code: string,
  language: string,
  userId: string,
): Promise<DebugResult> {
  const prisma = getPrismaClient();

  const prompt = codeDebuggerPrompt(code, language, "");

  try {
    const userKey = await getUserApiKey(userId);
    const completion = await nvidia.chatCompletion([
      { role: "system", content: "You are a senior code reviewer. Always return valid JSON only, no markdown." },
      { role: "user", content: prompt },
    ], userKey ? { apiKey: userKey } : {});

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed: Partial<DebugResult>;

    try {
      const cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {};
    }

    const result: DebugResult = {
      summary: parsed.summary || "Analysis complete.",
      bugs: Array.isArray(parsed.bugs) ? parsed.bugs : [],
      fixes: Array.isArray(parsed.fixes) ? parsed.fixes : [],
      optimizedCode: parsed.optimizedCode || code,
    };

    await prisma.toolExecution.create({
      data: {
        userId,
        toolName: "code-debugger",
        status: "completed",
        input: { language, codeLength: code.length },
        output: { bugsFound: result.bugs?.length || 0 },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    return result;
  } catch (err) {
    handleAIError(err, "nvidia");
  }
}
