# Learning & Coding Roadmap — Multi-Tool AI App (`toolstack-ai`)

This roadmap guides you through building a clean, scalable backend with Express, TypeScript, Prisma (PostgreSQL), and modern AI integrations (LLMs, RAG/PDF Chat, Vision, and Debuggers) with detailed code examples and architectural concepts.

---

## 🔍 Codebase Analysis

### 1. Current State
* **Scaffolding**: Setup is complete with Express, TypeScript, and Prisma ORM.
* **Authentication**: Basic signup/login flow is implemented with Zod validation, bcrypt hashing, and JWT tokens.
* **Chat Module**: The backend contains controllers, services, and routes for chats, but they are not registered in the main `app.ts` application yet. There are also slight naming mismatches between routes and controllers.

---

## 🗺️ Detailed Milestones & Code Examples

### Milestone 1: Stabilization & Chat Routing
* **Goal**: Correct the naming mismatches in the chat controllers/routes, protect them with JWT auth middleware, and register them in the global router.
* **Key Concept**: **Middleware Chaining**. Express processes requests through a chain of functions. By inserting an `authMiddleware` before your controller, you guarantee that only authenticated users can access the route, and their decoded user ID is attached to `req.user`.

#### Code Example: Corrected Routing & Auth Integration
```typescript
// backend/src/features/chat/conversation.routes.ts
import { Router } from "express";
import { createConversation, getConversations } from "./conversation.controller.js";
import { authMiddleware } from "../../shared/middleware/auth.middleware.js"; // hypothetical path

const router = Router();

// Chains authMiddleware so req.user is populated before the controller runs
router.post("/", authMiddleware, createConversation);
router.get("/", authMiddleware, getConversations);

export default router;
```

---

### Milestone 2: Centralized AI Provider Layer
* **Goal**: Abstract LLM communication so you do not write raw API calls in your controllers.
* **Key Concept**: **Provider Pattern**. By encapsulating the AI client initialization and raw API calls within a dedicated class or service, you can swap suppliers (e.g., from NVIDIA to OpenAI) by editing a single provider file instead of refactoring dozens of controllers.

#### Code Example: Centralized NVIDIA/OpenAI Client Provider
```typescript
// backend/src/ai/providers/nvidia.ts
import { OpenAI } from "openai";

export class AIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1", // or any OpenAI-compatible base URL
    });
  }

  async getChatCompletion(messages: { role: string; content: string }[]) {
    const response = await this.client.chat.completions.create({
      model: "meta/llama-3.1-405b-instruct",
      messages: messages as any,
      temperature: 0.2,
      max_tokens: 1024,
    });
    return response.choices[0].message.content;
  }
}
```

---

### Milestone 3: Real-Time Stream-Based Chat
* **Goal**: Stream responses back to the client token-by-token rather than making users wait for the full response.
* **Key Concept**: **Server-Sent Events (SSE)**. SSE keeps a HTTP connection open so the server can push chunks of text to the client as they are generated. 

#### Code Example: Streaming Response in Express
```typescript
// backend/src/features/chat/chat.controller.ts
import { Request, Response } from "express";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: "..." });

export async function streamChat(req: Request, res: Response) {
  const { prompt } = req.body;

  // Set SSE Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "meta/llama-3.1-405b-instruct",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        // SSE format: data: <payload>\n\n
        res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
    res.end();
  }
}
```

---

### Milestone 4: PDF Chat (RAG - Retrieval-Augmented Generation)
* **Goal**: Upload a PDF, extract text, break it into chunks, index it into a Vector DB, and retrieve relevant chunks to build a contextual prompt.
* **Key Concepts**:
  * **Embeddings**: Deep learning models that turn text blocks into arrays of numbers (vectors) representing semantic meaning.
  * **Similarity Search**: Comparing vector representations to fetch database chunks closest in meaning to the user's question.

#### Code Example: Generating Text Embeddings
```typescript
// backend/src/ai/embeddings/embedder.ts
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: "..." });

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "nvidia/llama-3.2-nv-embedqa-1b-v1",
    input: text,
    encoding_format: "float",
  });
  return response.data[0].embedding;
}
```

#### Code Example: Constructing a RAG Context Prompt
```typescript
// backend/src/features/pdf/rag.service.ts
export function buildRagPrompt(userQuestion: string, matchingTextChunks: string[]): string {
  const context = matchingTextChunks.join("\n---\n");
  return `
You are a helpful AI assistant. Use the following parsed context extracted from a PDF document to answer the question.
If the answer cannot be found in the context, state that you do not know. Do not make up answers.

Context:
${context}

Question: ${userQuestion}
Answer:`;
}
```

---

### Milestone 5: Vision-Based Image Analyzer
* **Goal**: Process uploaded images, send them to a Vision LLM, and return structured JSON summaries.
* **Key Concept**: **Structured Outputs**. Using LLMs to return strict JSON arrays or objects so the frontend application can reliably parse the response into structured UI cards without crashing.

#### Code Example: Vision API Call with Structured JSON
```typescript
// backend/src/features/image/image.service.ts
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: "..." });

export async function analyzeImage(imageBase64: string) {
  const response = await openai.chat.completions.create({
    model: "nvidia/neva-22b", // or another multimodal vision model
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze this image and identify visual patterns. Return response strictly as a JSON object matching this schema: { summary: string, visualLabels: string[] }" },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
        ],
      },
    ],
    response_format: { type: "json_object" }, // Enforce JSON output format
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}
```

---

### Milestone 6: Smart Code Debugger
* **Goal**: Analyze a codebase snippet, detect programming errors, and suggest fixes in structured formats.
* **Key Concept**: **System Role Steerage**. Directing the LLM using high-authority instructions so it strictly answers as a specialized debugger.

#### Code Example: System-Prompt Controlled Debugging
```typescript
// backend/src/features/debugger/debugger.service.ts
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.NVIDIA_API_KEY });

export async function debugCode(code: string, language: string) {
  const systemPrompt = `You are a world-class software security auditor and static analysis engine. 
Analyze the user's code for potential bugs, logical issues, and syntax errors.
Structure your output in markdown with three distinct sections:
1. Identified Bugs
2. Recommended Fixes
3. Optimized Code Block`;

  const response = await openai.chat.completions.create({
    model: "meta/llama-3.1-405b-instruct",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Language: ${language}\nCode:\n\`\`\`\n${code}\n\`\`\`` }
    ]
  });

  return response.choices[0].message.content;
}
```

---

## 🚀 How to Begin Implementing

Let's execute Milestone 1:
1. Fix routing references in the controllers.
2. Link the routes in `app.ts`.
3. Test a database insert using Prisma.
