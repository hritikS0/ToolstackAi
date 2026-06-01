import fs from "node:fs/promises";
import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { nvidia } from "../../ai/providers/nvidia.js";
import { imageAnalysisPrompt } from "../../ai/prompts/prompts.js";
import { logger } from "../../shared/utils/logger.js";
import { handleAIError } from "../../shared/utils/ai-error-handler.js";
import { saveMedia } from "../media/media.service.js";

const NVIDIA_VISION_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

function getApiKey(): string {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw Object.assign(new Error("NVIDIA_API_KEY not configured"), { statusCode: 500 });
  return key;
}

interface ImageAnalysisResult {
  summary: string;
  detectedObjects?: string[];
  issues?: string[];
  recommendations?: string[];
}

export async function analyzeImageService(
  file: Express.Multer.File,
  userId: string,
): Promise<ImageAnalysisResult> {
  const prisma = getPrismaClient();
  const apiKey = getApiKey();
  const model = process.env.NVIDIA_VISION_MODEL || "nvidia/nemotron-nano-12b-v2-vl";

  const fileBuffer = await fs.readFile(file.path);
  const base64Image = fileBuffer.toString("base64");
  const mimeType = file.mimetype;

  const systemPrompt = imageAnalysisPrompt();

  const response = await fetch(NVIDIA_VISION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
            { type: "text", text: "Analyze this image and return the analysis as JSON." },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw Object.assign(new Error(`Vision API error: ${response.status} ${errorBody}`), {
      statusCode: response.status,
    });
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  const rawContent = data.choices[0]?.message?.content || "{}";
  let result: ImageAnalysisResult;

  try {
    const cleaned = rawContent.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
    result = JSON.parse(cleaned);
  } catch {
    result = {
      summary: rawContent.slice(0, 500),
      detectedObjects: [],
      issues: [],
      recommendations: [],
    };
  }

  await prisma.toolExecution.create({
    data: {
      userId,
      toolName: "image-analysis",
      status: "completed",
      input: { fileName: file.originalname, mimeType },
      output: { summary: result.summary, objectsCount: (result.detectedObjects || result["objects" as keyof typeof result])?.length || 0 },
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  await saveMedia(file.path, file.originalname, mimeType, null, userId, "analyzed").catch((err) => {
    logger.error({ err, userId }, "Failed to save image to storage");
  });

  const toStr = (v: unknown): string => typeof v === "string" ? v : typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "");
  const arrStr = (arr: unknown): string[] => Array.isArray(arr) ? arr.map(toStr) : [];

  const raw = result as unknown as Record<string, unknown>;
  const objects = arrStr((raw.detectedObjects as unknown[]) || (raw.objects as unknown[]) || []);

  return {
    summary: toStr(result.summary),
    detectedObjects: objects,
    issues: arrStr(raw.issues),
    recommendations: arrStr(raw.recommendations),
  };
}
