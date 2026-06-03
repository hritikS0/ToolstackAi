import fs from "node:fs/promises";
import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { nvidia } from "../../ai/providers/nvidia.js";
import { logger } from "../../shared/utils/logger.js";
import { handleAIError } from "../../shared/utils/ai-error-handler.js";
import { autoExtractMemories } from "../brain/brain.service.js";
import { saveMedia } from "../media/media.service.js";
import { getUserKey } from "../api-keys/api-keys.service.js";

const NVIDIA_VISION_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

async function getApiKeyForUser(userId: string): Promise<string> {
  const userKey = await getUserKey(userId, "nvidia");
  if (userKey) return userKey;
  const envKey = process.env.NVIDIA_API_KEY;
  if (envKey) return envKey;
  throw Object.assign(new Error("NVIDIA API key not configured \u2014 add your key in Settings \u2192 API Keys"), { statusCode: 500 });
}

export async function visionChat(
  file: Express.Multer.File,
  message: string,
  conversationId: string,
  userId: string,
): Promise<{ answer: string; memorySaved: number }> {
  const apiKey = await getApiKeyForUser(userId);
  const model = process.env.NVIDIA_VISION_MODEL || "nvidia/nemotron-nano-12b-v2-vl";

  const fileBuffer = await fs.readFile(file.path);
  const base64Image = fileBuffer.toString("base64");
  const mimeType = file.mimetype;

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
          content: "You are a helpful assistant that can see images. Answer the user's question about the image concisely and accurately.",
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            { type: "text", text: message },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.7,
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

  const answer = data.choices[0]?.message?.content || "No response generated.";

  const media = await saveMedia(file.path, file.originalname, mimeType, conversationId, userId, "image");

  const prisma = getPrismaClient();
  await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, role: "user", content: message, chatMediaId: media.id },
    }),
    prisma.message.create({
      data: { conversationId, role: "assistant", content: answer },
    }),
    prisma.toolExecution.create({
      data: {
        conversationId,
        userId,
        toolName: "vision-chat",
        status: "completed",
        input: { message, mimeType },
        output: { answerLength: answer.length },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    }),
  ]);

  const memorySaved = await autoExtractMemories(message, userId).catch(() => 0);

  return { answer, memorySaved };
}
