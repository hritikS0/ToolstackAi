import fs from "node:fs/promises";
import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { generateEmbedding, chunkText } from "../../ai/embeddings/embeddings.js";
import { nvidia } from "../../ai/providers/nvidia.js";
import { pdfRagPrompt } from "../../ai/prompts/prompts.js";
import { InMemoryVectorStore } from "../../ai/vector-store/in-memory.js";
import { logger } from "../../shared/utils/logger.js";
import { handleAIError } from "../../shared/utils/ai-error-handler.js";
import {
  uploadFileFromDisk,
  getSignedUrl,
  deleteFile,
} from "../../services/storage.service.js";
const documentStores = new Map<string, InMemoryVectorStore>();

async function extractPdfText(filePath: string): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const fileBuffer = await fs.readFile(filePath);
  const pdf = new PDFParse({ data: new Uint8Array(fileBuffer) });
  const textResult = await pdf.getText();
  pdf.destroy().catch(() => {});
  return textResult.text || "";
}

export async function processPdfUpload(
  file: Express.Multer.File,
  userId: string,
): Promise<{ documentId: string; name: string; chunks: number }> {
  const prisma = getPrismaClient();

  const extractedText = await extractPdfText(file.path);

  const document = await prisma.conversation.create({
    data: {
      title: file.originalname.replace(/\.pdf$/i, ""),
      type: "pdf",
      userId,
    },
  });

  const upload = await uploadFileFromDisk(file.path, file.originalname, "application/pdf", userId, "pdfs");

  await prisma.conversation.update({
    where: { id: document.id },
    data: { storagePath: upload.fullPath },
  });

  await prisma.storedFile.create({
    data: {
      userId,
      name: file.originalname,
      type: "pdf",
      bucket: "pdfs",
      storagePath: upload.fullPath,
      size: file.size,
      mimeType: "application/pdf",
    },
  });

  const chunks = await chunkText(extractedText);
  const store = new InMemoryVectorStore();

  const CONCURRENCY = 3;
  const results: { chunkId: string; vector: number[]; chunkIndex: number; text: string }[] = [];

  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (text, j) => {
        const chunkIndex = i + j;
        const vector = await generateEmbedding(text, "passage", userId);
        return { chunkId: `${document.id}-chunk-${chunkIndex}`, vector, chunkIndex, text };
      }),
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        logger.error({ err: result.reason, chunkIndex: "unknown" }, "Failed to embed PDF chunk");
      }
    }
  }

  for (const { chunkId, vector, chunkIndex, text } of results) {
    await store.storeEmbedding(chunkId, vector, {
      documentId: document.id,
      chunkIndex,
      text,
    });
  }

  documentStores.set(document.id, store);

  return { documentId: document.id, name: file.originalname, chunks: chunks.length };
}

export async function getPdfFilePath(documentId: string): Promise<string> {
  const prisma = getPrismaClient();
  const conv = await prisma.conversation.findUnique({
    where: { id: documentId },
    select: { storagePath: true },
  });
  if (!conv?.storagePath) throw Object.assign(new Error("PDF file not found in storage"), { statusCode: 404 });
  return getSignedUrl(conv.storagePath, "pdfs");
}

export async function deletePdfFromStorage(documentId: string): Promise<void> {
  const prisma = getPrismaClient();
  const conv = await prisma.conversation.findUnique({
    where: { id: documentId },
    select: { storagePath: true },
  });
  if (conv?.storagePath) {
    await deleteFile(conv.storagePath, "pdfs").catch(() => {});
    await prisma.conversation.update({
      where: { id: documentId },
      data: { storagePath: "" },
    });
    await prisma.storedFile.deleteMany({ where: { storagePath: conv.storagePath } }).catch(() => {});
  }
}

export async function answerPdfQuestion(
  question: string,
  documentId: string,
  userId: string,
): Promise<{ answer: string }> {
  const store = documentStores.get(documentId);
  if (!store) {
    throw Object.assign(new Error("Document not found. Please upload the PDF again."), { statusCode: 404 });
  }

  const questionVector = await generateEmbedding(question, "query", userId);
  const results = await store.searchEmbeddings(questionVector, 5);
  const context = results
    .map((r) => (r.metadata as { text?: string }).text || "")
    .filter(Boolean)
    .join("\n\n---\n\n");

  if (!context) {
    return { answer: "No relevant content found in the document to answer your question." };
  }

  const MAX_CONTEXT_CHARS = 3000;
  const truncated = context.length > MAX_CONTEXT_CHARS ? context.slice(0, MAX_CONTEXT_CHARS) + "\n\n[...]" : context;

  const prompt = pdfRagPrompt(truncated, question);

  logger.info({ contextLength: truncated.length, documentId }, "answerPdfQuestion prompt");

  try {
    const completion = await nvidia.chatCompletion([
      { role: "system", content: "You are a document analysis assistant. Answer concisely based only on the provided context." },
      { role: "user", content: `Context:\n${truncated}\n\nQuestion: ${question}` },
    ]);
    const answer = completion.choices[0]?.message?.content || "No response generated.";

    logger.info({ answerLength: answer.length }, "answerPdfQuestion response");

    const prisma = getPrismaClient();
    await prisma.$transaction([
      prisma.message.create({
        data: { conversationId: documentId, role: "user", content: question },
      }),
      prisma.message.create({
        data: { conversationId: documentId, role: "assistant", content: answer },
      }),
      prisma.toolExecution.create({
        data: {
          conversationId: documentId,
          toolName: "pdf-rag",
          status: "completed",
          input: { question } as never,
          output: { answerLength: answer.length } as never,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      }),
    ]);

    return { answer };
  } catch (err) {
    logger.error({ err, documentId, question }, "answerPdfQuestion failed");
    throw Object.assign(new Error("Failed to get response from AI. Please try again."), { statusCode: 502 });
  }
}
