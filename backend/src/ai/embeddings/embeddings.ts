import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { handleAIError } from "../../shared/utils/ai-error-handler.js";
import { logger } from "../../shared/utils/logger.js";

const NVIDIA_EMBED_URL = "https://integrate.api.nvidia.com/v1/embeddings";

function getApiKey(): string {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    throw Object.assign(new Error("NVIDIA_API_KEY not configured"), { statusCode: 500 });
  }
  return key;
}

export async function generateEmbedding(text: string, inputType?: "query" | "passage"): Promise<number[]> {
  const apiKey = getApiKey();
  const model = process.env.NVIDIA_EMBED_MODEL || "nvidia/llama-nemotron-embed-vl-1b-v2";

  try {
    const body: Record<string, unknown> = {
      model,
      input: text,
      encoding_format: "float",
    };
    if (inputType) body.input_type = inputType;

    const response = await fetch(NVIDIA_EMBED_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw Object.assign(new Error(`NVIDIA Embedding API error: ${response.status} ${errorBody}`), {
        statusCode: response.status,
      });
    }

    const data = (await response.json()) as { data: { embedding: number[] }[] };
    return data.data[0].embedding;
  } catch (err) {
    handleAIError(err, "nvidia-embedding");
  }
}

export async function chunkText(text: string, maxChunkSize = 500, overlap = 50): Promise<string[]> {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  if (chunks.length === 0 && text.trim()) {
    chunks.push(text.trim());
  }

  return chunks;
}

export async function embedDocumentChunks(
  documentId: string,
  chunks: string[],
): Promise<void> {
  const prisma = getPrismaClient();
  const { InMemoryVectorStore } = await import("../vector-store/in-memory.js");
  const store = new InMemoryVectorStore();

  for (let i = 0; i < chunks.length; i++) {
    try {
      const vector = await generateEmbedding(chunks[i], "passage");
      const chunkId = `${documentId}-chunk-${i}`;

      await store.storeEmbedding(chunkId, vector, {
        documentId,
        chunkIndex: i,
        text: chunks[i],
      });

      await prisma.toolExecution.create({
        data: {
          conversationId: documentId,
          toolName: "embedding",
          status: "completed",
          input: { chunkIndex: i, text: chunks[i].slice(0, 200) },
          output: { vectorLength: vector.length },
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
    } catch (err) {
      logger.error({ err, chunkIndex: i }, "Failed to embed chunk");
    }
  }
}
