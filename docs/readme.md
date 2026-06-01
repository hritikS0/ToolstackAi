# ToolStackAI — Documentation

> An AI-powered developer operating system built with Express 5 + TypeScript (backend) and React 19 + Vite + Tailwind v4 (frontend).

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Project Structure](#2-project-structure)
- [3. Backend Architecture](#3-backend-architecture)
  - [3.1 Middleware Stack](#31-middleware-stack)
  - [3.2 Route Modules](#32-route-modules)
  - [3.3 Service / Controller Pattern](#33-service--controller-pattern)
- [4. Frontend Architecture](#4-frontend-architecture)
  - [4.1 Component Hierarchy](#41-component-hierarchy)
  - [4.2 State Management](#42-state-management)
  - [4.3 Service Layer](#43-service-layer)
  - [4.4 Routing](#44-routing)
- [5. API Reference](#5-api-reference)
  - [5.1 Auth](#51-auth)
  - [5.2 Chat](#52-chat)
  - [5.3 PDF](#53-pdf)
  - [5.4 Image](#54-image)
  - [5.5 Debug](#55-debug)
- [6. AI Integration](#6-ai-integration)
  - [6.1 NVIDIA Provider](#61-nvidia-provider)
  - [6.2 Chat Completion (Non-Streaming)](#62-chat-completion-non-streaming)
  - [6.3 Chat Completion (SSE Streaming)](#63-chat-completion-sse-streaming)
  - [6.4 Vision API](#64-vision-api)
  - [6.5 Embeddings](#65-embeddings)
- [7. Feature Pipelines](#7-feature-pipelines)
  - [7.1 Authentication](#71-authentication)
  - [7.2 Chat (Streaming)](#72-chat-streaming)
  - [7.3 Vision Chat (Image in Chat)](#73-vision-chat-image-in-chat)
  - [7.4 PDF Analysis (RAG)](#74-pdf-analysis-rag)
  - [7.5 Image Analysis](#75-image-analysis)
  - [7.6 Code Debugger](#76-code-debugger)
  - [7.7 Theme System](#77-theme-system)
- [8. Data Model](#8-data-model)
- [9. Configuration & Environment](#9-configuration--environment)
- [10. Quick Start](#10-quick-start)

---

## 1. Overview

ToolStackAI is a full-stack application that provides:

- **AI Chat** — streaming chat completions via NVIDIA LLM with SSE
- **PDF Analysis** — upload PDFs, extract text, embed chunks, and ask questions with RAG
- **Image Analysis** — upload images for vision-powered analysis (objects, issues, recommendations)
- **Vision Chat** — attach images inline in chat for multimodal conversation
- **Code Debugger** — paste code and get structured bug reports + fixes from AI
- **Theme Manager** — 12 built-in themes with real-time CSS variable injection, customization, and persistence

**Stack:**
| Layer | Technology |
|-------|-----------|
| Backend framework | Express 5, TypeScript, ESM (`"type": "module"`) |
| Database | PostgreSQL via Prisma ORM |
| AI provider | NVIDIA NIM (free tier) — llama-3.1-8b-instruct, nemotron-nano-12b-v2-vl, llama-nemotron-embed-vl-1b-v2 |
| Frontend framework | React 19, TypeScript |
| Build tool | Vite 8 + Tailwind CSS v4 |
| State management | React Query (server state), React Context (auth, theme) |
| Routing | React Router v7 |
| Auth | JWT (jsonwebtoken), bcrypt |

---

## 2. Project Structure

```
toolstack-ai/
├── backend/
│   ├── src/
│   │   ├── app.ts                  # Express app setup, middleware, route registration
│   │   ├── server.ts               # Entry point — starts HTTP server
│   │   ├── ai/
│   │   │   ├── providers/nvidia.ts # NVIDIA API client (chat, stream)
│   │   │   ├── prompts/prompts.ts  # System prompts for each feature
│   │   │   ├── embeddings/embeddings.ts # Embedding generation, text chunking
│   │   │   └── vector-store/
│   │   │       ├── types.ts        # VectorStore interface
│   │   │       ├── in-memory.ts    # InMemoryVectorStore (cosine similarity)
│   │   │       └── index.ts        # Barrel export
│   │   ├── features/
│   │   │   ├── auth/               # Register, login, profile update
│   │   │   ├── chat/               # Conversations CRUD, messages, stream, vision
│   │   │   ├── pdf/                # PDF upload, RAG Q&A, file serving
│   │   │   ├── image/              # Image analysis via vision API
│   │   │   └── debug/              # Code debugger
│   │   ├── shared/
│   │   │   ├── middleware/         # auth.middleware, errorHandler, requestLogger
│   │   │   ├── utils/             # multer, logger, ai-error-handler
│   │   │   └── db/                # Prisma client singleton
│   │   └── generated/prisma/      # Generated Prisma client
│   ├── prisma/
│   │   └── schema.prisma          # Data model
│   ├── uploads/                   # File storage (pdfs/, images/)
│   └── .env                       # Backend environment variables
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # Root component with providers
│   │   ├── config.ts               # Typed env variable accessor
│   │   ├── api/client.ts           # Axios instance with JWT interceptor
│   │   ├── store/
│   │   │   ├── auth.tsx            # AuthProvider + useAuth context
│   │   │   └── theme.tsx          # ThemeProvider + useTheme context
│   │   ├── services/              # Feature-specific API calls (chat, pdf, image, debug, auth)
│   │   ├── types/api.ts           # Shared TypeScript interfaces
│   │   ├── themes/                # Theme types, 12 built-in themes, color utilities
│   │   ├── layouts/              # AppLayout (sidebar + header + outlet)
│   │   ├── components/
│   │   │   ├── layout/           # Sidebar, UserMenu, UserAvatar
│   │   │   ├── chat/             # Composer, MessageBlock
│   │   │   ├── theme/            # ThemeModal, ThemeCard, PreviewPanel
│   │   │   └── ui/               # Button, Dialog, Input, Badge, Tabs, Skeleton
│   │   ├── pages/                 # 9 pages (landing, login, register, dashboard, chat, pdf-chat, image-analyzer, code-debugger, conversations, settings)
│   │   ├── routes/index.tsx       # Route definitions
│   │   └── index.css              # Tailwind imports, CSS variables, animations
│   ├── .env                       # Frontend environment variables
│   └── vite.config.ts             # Vite config with proxy and path alias
│
├── openspec/                      # OpenSpec spec-driven development files
└── docs/docs.md                   # This document
```

---

## 3. Backend Architecture

### 3.1 Middleware Stack

The Express app (`backend/src/app.ts`) applies middleware in this order:

```
Request
  │
  ▼
helmet()                     ← Security headers
  │
  ▼
cors()                       ← Cross-origin support
  │
  ▼
express-rate-limit           ← 100 requests/min per IP
  │
  ▼
requestLogger                ← Logs method, URL, status, duration via pino
  │
  ▼
express.json (1mb limit)     ← Parse JSON bodies
  │
  ▼
express.urlencoded           ← Parse URL-encoded bodies
  │
  ▼
  ├── /health                ← Health check (no auth)
  ├── /api/auth/*            ← Auth routes
  ├── /api/chat/*            ← Conversation + message routes (authenticated)
  ├── /api/pdf/*             ← PDF routes (authenticated)
  ├── /api/image/*           ← Image routes (authenticated)
  └── /api/debug/*           ← Debug routes (authenticated)
  │
  ▼
errorHandler                 ← Catches all errors, returns { success, message }
```

### 3.2 Route Modules

Each feature is a self-contained module with routes, controller, service, and validator files:

```
src/features/<name>/
├── <name>.routes.ts      ← Express Router, registers endpoints + middleware
├── <name>.controller.ts  ← Request/response handlers, delegates to service
├── <name>.service.ts     ← Business logic, database access, AI calls
└── <name>.validator.ts   ← Zod schemas for request validation
```

### 3.3 Service / Controller Pattern

```
Browser → HTTP Request → Router → authenticate middleware → Controller
  → Service (business logic, Prisma queries, AI calls)
  → Response
```

Controllers never access the database directly. They extract data from `req`, validate with Zod, call the service, and return the response.

---

## 4. Frontend Architecture

### 4.1 Component Hierarchy

```
<QueryClientProvider>
  <BrowserRouter>
    <AuthProvider>              ← Manages user state, login/logout
      <ThemeProvider>           ← Manages theme state, CSS variable injection
        <AppRoutes>             ← React Router v7 route definitions
          ├── / → <LandingPage>
          ├── /login → <LoginPage>
          ├── /register → <RegisterPage>
          └── <AppLayout>       ← Sidebar + Header(UserMenu) + <Outlet>
                ├── /dashboard → <DashboardPage>
                ├── /chat → <ChatPage> or /chat/:id → <ChatPage>
                ├── /pdf → <PdfChatPage> or /pdf/:id → <PdfChatPage>
                ├── /image → <ImageAnalyzerPage>
                ├── /debug → <CodeDebuggerPage>
                ├── /conversations → <ConversationsPage>
                └── /settings → <SettingsPage>
      </ThemeProvider>
    </AuthProvider>
  </BrowserRouter>
</QueryClientProvider>
```

### 4.2 State Management

| Concern | Solution | Scope |
|---------|----------|-------|
| Server state (conversations, messages) | React Query (`@tanstack/react-query`) | Global |
| Auth (user, token) | React Context (`AuthProvider`) | Global |
| Theme (config, toggle) | React Context (`ThemeProvider`) | Global |
| UI state (streaming, input, modals) | Local `useState` / `useRef` | Per component |
| Cache invalidation | `queryClient.invalidateQueries()` | After mutations |

### 4.3 Service Layer

Services in `src/services/*.ts` wrap API calls with typed responses:

- `auth.service.ts` — login, register, logout, getUser, getToken
- `chat.service.ts` — conversations CRUD, messages, visionChat (FormData), streamChat (fetch reader)
- `pdf.service.ts` — upload (FormData), chat, getPdfFileUrl
- `image.service.ts` — analyze (FormData with image)
- `debug.service.ts` — analyzeCode (JSON)

The Axios instance (`src/api/client.ts`) automatically:
- Attaches `Authorization: Bearer <token>` from localStorage
- Redirects to `/login` on 401 responses

### 4.4 Routing

All authenticated routes are nested under `<AppLayout>`, which provides the sidebar and header. The `<ThemeModal>` is mounted in `<AppLayout>` and controlled via `useTheme().isOpen`.

---

## 5. API Reference

All protected endpoints require `Authorization: Bearer <token>` header.

### 5.1 Auth

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| POST | `/api/auth/register` | No | `{ email, password, fullName }` | `{ success, token, user }` |
| POST | `/api/auth/login` | No | `{ email, password }` | `{ success, token, user }` |
| PUT | `/api/auth/me` | Yes | `{ fullName? }` | `{ success, data: user }` |

### 5.2 Chat

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| GET | `/api/chat/conversations` | Yes | — | `{ success, data: Conversation[] }` |
| POST | `/api/chat/conversations` | Yes | `{ title? }` | `{ success, data: { conversation } }` |
| DELETE | `/api/chat/conversations/:id` | Yes | — | `200 OK` |
| PATCH | `/api/chat/conversations/:id` | Yes | `{ title? }` | `{ success, data: Conversation }` |
| POST | `/api/chat/message` | Yes | `{ message, conversationId }` | `{ success, data: Message }` |
| GET | `/api/chat/message?conversationId=` | Yes | — | `{ success, data: Message[] }` |
| POST | `/api/chat/stream` | Yes | `{ message, conversationId }` | SSE stream of `data: { content }` chunks |
| POST | `/api/chat/vision` | Yes | `multipart/form-data: { image, message, conversationId }` | `{ success, data: { answer } }` |

### 5.3 PDF

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| POST | `/api/pdf/upload` | Yes | `multipart/form-data: { file }` | `{ success, data: { documentId, name, chunks } }` |
| POST | `/api/pdf/chat` | Yes | `{ message, documentId }` | `{ success, data: { answer } }` |
| GET | `/api/pdf/:id/file` | Yes | — | `application/pdf` binary stream |

### 5.4 Image

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| POST | `/api/image/analyze` | Yes | `multipart/form-data: { image }` | `{ success, data: { summary, detectedObjects, issues, recommendations } }` |

### 5.5 Debug

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| POST | `/api/debug` | Yes | `{ code, language }` | `{ success, data: { summary, bugs[], fixes[], optimizedCode } }` |

---

## 6. AI Integration

### 6.1 NVIDIA Provider

File: `backend/src/ai/providers/nvidia.ts`

A singleton `nvidia` object exposes two methods:

```typescript
export const nvidia = {
  chatCompletion(messages, options?) → Promise<ChatCompletionResponse>,
  chatCompletionStream(messages, options?) → AsyncGenerator<string>,
}
```

Both call `https://integrate.api.nvidia.com/v1/chat/completions` with the configured model. The streaming variant uses `stream: true` and parses SSE `data:` lines, yielding content deltas.

**Models used (configurable via env):**

| Purpose | Env Var | Default |
|---------|---------|---------|
| Chat / streaming | `NVIDIA_CHAT_MODEL` | `meta/llama-3.1-8b-instruct` |
| Vision | `NVIDIA_VISION_MODEL` | `nvidia/nemotron-nano-12b-v2-vl` |
| Embeddings | `NVIDIA_EMBED_MODEL` | `nvidia/llama-nemotron-embed-vl-1b-v2` |

### 6.2 Chat Completion (Non-Streaming)

```
generateAiResponse(message, conversationId, userId)
  │
  ├── createMessageService(message, conversationId, "user")    ← Save user message
  ├── prisma.message.findMany(desc, take:50) + reverse()       ← Fetch history (newest 50)
  ├── buildMessages(history)                                   ← Prepend system prompt
  ├── nvidia.chatCompletion(messages)                          ← Call NVIDIA
  ├── createMessageService(aiContent, conversationId, "assistant") ← Save response
  ├── autoTitleConversation()                                  ← Set title from first message
  └── logToolExecution()                                       ← Log to ToolExecution table
```

### 6.3 Chat Completion (SSE Streaming)

```
streamAiResponse(message, conversationId, userId)
  │
  ├── createMessageService(message, conversationId, "user")   ← Save user message immediately
  ├── prisma.message.findMany(desc, take:50) + reverse()
  ├── buildMessages(history)
  ├── nvidia.chatCompletionStream(messages)                   ← SSE stream from NVIDIA
  │   └── for each chunk: yield content
  │
  ├── [If stream fails or yields nothing]
  │   └── nvidia.chatCompletion(messages)                     ← Non-streaming fallback
  │
  ├── createMessageService(fullContent, conversationId, "assistant") ← Save final response
  ├── autoTitleConversation()
  └── logToolExecution()
```

The stream controller (`stream.controller.ts`) sets SSE headers and writes chunks as `data: { "content": "..." }\n\n`.

### 6.4 Vision API

The vision endpoint calls the NVIDIA vision model directly via `fetch` (not through the `nvidia` provider) because the request body includes multimodal content (`image_url`).

```
POST https://integrate.api.nvidia.com/v1/chat/completions
{
  model: "nvidia/nemotron-nano-12b-v2-vl",
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: [
      { type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } },
      { type: "text", text: "Analyze this image..." }
    ]}
  ]
}
```

### 6.5 Embeddings

File: `backend/src/ai/embeddings/embeddings.ts`

The embedding model is **asymmetric** — it requires an `input_type` parameter:

| Use Case | `input_type` value |
|----------|-------------------|
| Document chunks (indexing) | `"passage"` |
| User questions (search) | `"query"` |

```typescript
generateEmbedding(text, "passage")  // For PDF chunk storage
generateEmbedding(text, "query")    // For user question at search time
```

**Chunking:** Text is split on sentence boundaries with configurable max chunk size (default 500 chars) and no overlap. Embedded concurrently with concurrency 3.

---

## 7. Feature Pipelines

### 7.1 Authentication

```
User                  Browser/Frontend           Backend                    Database
 │                        │                         │                         │
 │  Register/Login        │                         │                         │
 │───────────────────────►│                         │                         │
 │                        │  POST /api/auth/login    │                         │
 │                        │────────────────────────►│                         │
 │                        │                         │  SELECT user WHERE email │
 │                        │                         │────────────────────────►│
 │                        │                         │◄────────────────────────│
 │                        │                         │                         │
 │                        │                         │  bcrypt.compare()        │
 │                        │                         │  jwt.sign({ userId })    │
 │                        │                         │                         │
 │                        │◄──── { token, user } ───│                         │
 │                        │                         │                         │
 │                        │  Store token + user in  │                         │
 │                        │  localStorage           │                         │
 │◄───── Redirect ────────│                         │                         │
 │                        │                         │                         │
 │  Protected Action      │                         │                         │
 │───────────────────────►│                         │                         │
 │                        │  GET /api/chat/messages  │                         │
 │                        │  Authorization: Bearer  │                         │
 │                        │────────────────────────►│                         │
 │                        │                         │  jwt.verify(token)      │
 │                        │                         │  req.user = { id, email}│
 │                        │                         │  Prisma query (owned)   │
 │                        │                         │────────────────────────►│
 │                        │◄────── Response ────────│◄────────────────────────│
 │◄───────────────────────│                         │                         │
```

### 7.2 Chat (Streaming)

```
User            ChatPage (React)       SSE Stream (Backend)       NVIDIA API           Database
 │                    │                        │                      │                    │
 │ Type & Send        │                        │                      │                    │
 │───────────────────►│                        │                      │                    │
 │                    │  optimisticUserMsg set  │                      │                    │
 │                    │  POST /api/chat/stream  │                      │                    │
 │                    │────────────────────────►│                      │                    │
 │                    │                        │  Save user message    │                    │
 │                    │                        │──────────────────────►                    │
 │                    │                        │                      │                    │
 │                    │                        │  Fetch history       │                    │
 │                    │                        │  (last 50, desc+rev) │                    │
 │                    │                        │──────────────────────►                    │
 │                    │                        │                      │                    │
 │                    │                        │  POST /chat/completions (stream: true)      │
 │                    │                        │──────────────────────►│                    │
 │                    │                        │                      │                    │
 │                    │  data: { content } ◄───│◄── SSE chunks ──────│                    │
 │                    │  (rAF-throttled render) │                      │                    │
 │                    │                        │                      │                    │
 │                    │  data: [DONE]          │                      │                    │
 │                    │◄───────────────────────│                      │                    │
 │                    │                        │  Save assistant msg  │                    │
 │                    │                        │──────────────────────►                    │
 │                    │                        │                      │                    │
 │                    │  Clear optimistic,     │                      │                    │
 │                    │  invalidate messages   │                      │                    │
 │                    │  query (refetch)       │                      │                    │
 │                    │                        │                      │                    │
 │   sees response ◄──│                        │                      │                    │
```

### 7.3 Vision Chat (Image in Chat)

```
User            Composer            ChatPage            Backend Vision           NVIDIA Vision API           Database
 │                  │                  │                    │                         │                       │
 │ Attach image     │                  │                    │                         │                       │
 │─────────────────►│                  │                    │                         │                       │
 │                  │ file → preview   │                    │                         │                       │
 │                  │─────────────────►│                    │                         │                       │
 │                  │                  │                    │                         │                       │
 │ Send (with img)  │                  │                    │                         │                       │
 │────────────────────────────────────►│                    │                         │                       │
 │                  │                  │ optimisticUserMsg  │                         │                       │
 │                  │                  │ + localImageCache  │                         │                       │
 │                  │                  │ POST /api/chat/vision (multipart)             │                       │
 │                  │                  │───────────────────►│                         │                       │
 │                  │                  │                    │  Read file → base64     │                       │
 │                  │                  │                    │  POST chat/completions  │                       │
 │                  │                  │                    │  with image_url         │                       │
 │                  │                  │                    │─────────────────────────►│                       │
 │                  │                  │                    │                         │                       │
 │                  │                  │                    │◄─── { answer } ─────────│                       │
 │                  │                  │                    │                         │                       │
 │                  │                  │                    │  $transaction:          │                       │
 │                  │                  │                    │  └─ create user msg     │                       │
 │                  │                  │                    │  └─ create assistant    │                       │
 │                  │                  │                    │  └─ create ToolExecution│                       │
 │                  │                  │                    │─────────────────────────►                       │
 │                  │                  │                    │                         │                       │
 │                  │                  │                    │  Delete temp file       │                       │
 │                  │                  │◄── { answer } ────│                         │                       │
 │                  │                  │                    │                         │                       │
 │                  │                  │  setStreamContent  │                         │                       │
 │                  │                  │  Clear optimistic  │                         │                       │
 │                  │                  │  invalidate msgs   │                         │                       │
 │ sees img + text◄─│                  │                    │                         │                       │
```

### 7.4 PDF Analysis (RAG)

**Upload Pipeline:**

```
User            PdfChatPage           Backend PDF           pdf-parse          NVIDIA Embeddings      InMemoryVectorStore        DB
 │                  │                    │                     │                    │                        │                  │
 │ Select PDF       │                    │                     │                    │                        │                  │
 │─────────────────►│                    │                     │                    │                        │                  │
 │                  │ POST /api/pdf/     │                     │                    │                        │                  │
 │                  │ upload (multipart) │                     │                    │                        │                  │
 │                  │───────────────────►│                     │                    │                        │                  │
 │                  │                    │ Save to uploads/pdfs│                    │                        │                  │
 │                  │                    │────────────────────►│                    │                        │                  │
 │                  │                    │ Read + extract text │                    │                        │                  │
 │                  │                    │────────────────────►│                    │                        │                  │
 │                  │                    │◄── raw text ───────│                    │                        │                  │
 │                  │                    │                     │                    │                        │                  │
 │                  │                    │ Create Conversation │                    │                        │                  │
 │                  │                    │ (type: "pdf")       │                    │                        │                  │
 │                  │                    │─────────────────────────────────────────────────────────────────►│                  │
 │                  │                    │                     │                    │                        │                  │
 │                  │                    │ chunkText(raw)      │                    │                        │                  │
 │                  │                    │ (sentence split)    │                    │                        │                  │
 │                  │                    │────────────────────►│                    │                        │                  │
 │                  │                    │                     │                    │                        │                  │
 │                  │                    │ For each chunk      │                    │                        │                  │
 │                  │                    │ (concurrency: 3)    │                    │                        │                  │
 │                  │                    │─────────────────────────────────────────►│                        │                  │
 │                  │                    │                     │                    │ embed(text, "passage") │                  │
 │                  │                    │                     │                    │───────────────────────►│                  │
 │                  │                    │                     │                    │                        │                  │
 │                  │                    │ Copy PDF to         │                    │                        │                  │
 │                  │                    │ uploads/pdfs/       │                    │                        │                  │
 │                  │                    │ Delete temp file    │                    │                        │                  │
 │                  │                    │                     │                    │                        │                  │
 │                  │◄── { documentId }──│                     │                    │                        │                  │
 │◄─── shows PDF ───│                    │                     │                    │                        │                  │
```

**Question Pipeline:**

```
User            PdfChatPage           Backend PDF            NVIDIA Embeddings      InMemoryVectorStore      NVIDIA Chat         DB
 │                  │                    │                        │                      │                    │                 │
 │ Type question    │                    │                        │                      │                    │                 │
 │─────────────────►│                    │                        │                      │                    │                 │
 │                  │ POST /api/pdf/chat │                        │                      │                    │                 │
 │                  │ { message, docId } │                        │                      │                    │                 │
 │                  │───────────────────►│                        │                      │                    │                 │
 │                  │                    │ embed(question,        │                      │                    │                 │
 │                  │                    │   "query")             │                      │                    │                 │
 │                  │                    │───────────────────────►│                      │                    │                 │
 │                  │                    │                        │  cosine similarity   │                    │                 │
 │                  │                    │ search top 5           │                      │                    │                 │
 │                  │                    │──────────────────────────────────────────────►│                    │                 │
 │                  │                    │◄── { chunks w/ text }─│◄─────────────────────│                    │                 │
 │                  │                    │                        │                      │                    │                 │
 │                  │                    │ Build RAG prompt       │                      │                    │                 │
 │                  │                    │ (truncated to 3000ch)  │                      │                    │                 │
 │                  │                    │ nvidia.chatCompletion  │                      │                    │                 │
 │                  │                    │ (system + context)     │                      │                    │                 │
 │                  │                    │───────────────────────────────────────────────────────────────►│                 │
 │                  │                    │                        │                      │                    │                 │
 │                  │                    │ $transaction:         │                      │                    │                 │
 │                  │                    │ └─ save user msg      │                      │                    │                 │
 │                  │                    │ └─ save assistant msg │                      │                    │                 │
 │                  │                    │ └─ log ToolExecution  │                      │                    │                 │
 │                  │                    │───────────────────────────────────────────────────────────────────►             │
 │                  │                    │                        │                      │                    │                 │
 │                  │◄── { answer } ─────│                        │                      │                    │                 │
 │◄── sees answer ──│                    │                        │                      │                    │                 │
```

### 7.5 Image Analysis

```
User            ImageAnalyzerPage      Backend Image           NVIDIA Vision API        Database
 │                    │                     │                       │                     │
 │ Drop/Select image  │                     │                       │                     │
 │───────────────────►│                     │                       │                     │
 │                    │ POST /api/image/    │                       │                     │
 │                    │ analyze (multipart) │                       │                     │
 │                    │────────────────────►│                       │                     │
 │                    │                     │ Read file → base64    │                     │
 │                    │                     │ POST chat/completions │                     │
 │                    │                     │  (with image_url +    │                     │
 │                    │                     │   system prompt for   │                     │
 │                    │                     │   structured JSON)    │                     │
 │                    │                     │──────────────────────►│                     │
 │                    │                     │                       │                     │
 │                    │                     │◄── raw JSON string ──│                     │
 │                    │                     │                       │                     │
 │                    │                     │ Strip markdown fences │                     │
 │                    │                     │ JSON.parse()          │                     │
 │                    │                     │ toStr/arrStr fallback │                     │
 │                    │                     │ Log ToolExecution     │                     │
 │                    │                     │──────────────────────►│                     │
 │                    │                     │ Delete temp file      │                     │
 │                    │                     │                       │                     │
 │                    │◄── structured data─│                       │                     │
 │                    │  {summary, objects, │                       │                     │
 │                    │   issues, recs}     │                       │                     │
 │◄─── cards display──│                     │                       │                     │
```

### 7.6 Code Debugger

```
User            CodeDebuggerPage        Backend Debug           NVIDIA Chat              Database
 │                    │                      │                       │                     │
 │ Paste code         │                      │                       │                     │
 │ Select language    │                      │                       │                     │
 │ Click Analyze      │                      │                       │                     │
 │───────────────────►│                      │                       │                     │
 │                    │ POST /api/debug      │                       │                     │
 │                    │ { code, language }   │                       │                     │
 │                    │─────────────────────►│                       │                     │
 │                    │                      │ Zod validation        │                     │
 │                    │                      │ nvidia.chatCompletion │                     │
 │                    │                      │ (system + prompt)     │                     │
 │                    │                      │──────────────────────►│                     │
 │                    │                      │                       │                     │
 │                    │                      │◄── JSON response ────│                     │
 │                    │                      │                       │                     │
 │                    │                      │ Strip markdown fences │                     │
 │                    │                      │ JSON.parse()          │                     │
 │                    │                      │ Shape validation      │                     │
 │                    │                      │ (fallback values)     │                     │
 │                    │                      │ Log ToolExecution     │                     │
 │                    │                      │──────────────────────►│                     │
 │                    │                      │                       │                     │
 │                    │◄── structured data ─│                       │                     │
 │                    │  {summary, bugs[],   │                       │                     │
 │                    │   fixes[], optCode}  │                       │                     │
 │◄─── tabs display──│                      │                       │                     │
```

### 7.7 Theme System

**Architecture:**

```
ThemeProvider (store/theme.tsx)
  │
  ├── loadTheme() → localStorage.getItem("toolstack-theme") → JSON.parse || defaultTheme
  │
  ├── applyTheme(theme)
  │   └── document.documentElement.style.setProperty("--color-*", value)
  │        (25+ CSS variables: workspace, surface, accent, base-50..950, font, density, radius)
  │
  ├── setTheme(newTheme)
  │   ├── applyTheme(newTheme)
  │   ├── localStorage.setItem("toolstack-theme", JSON.stringify(newTheme))
  │   └── Re-render consumers
  │
  └── Keyboard shortcut: Cmd/Ctrl+Shift+T toggles ThemeModal
```

**Theme Data Flow:**

```
User selects theme (ThemeCard)
  │
  ▼
setTheme(selectedTheme)          ← ThemeConfig object { id, name, colors, typography, density, borderRadius }
  │
  ├── applyTheme()
  │   ├── 20 color variables      (workspace, surface, accent, base-50..base-950, etc.)
  │   ├── 2 font variables        (--font-mono, --font-sans)
  │   ├── 1 font-size             (document.rootElement.style.fontSize)
  │   ├── 2 density variables     (--density-line-height)
  │   ├── 3 radius variables      (--radius-sm, --radius-md, --radius-lg)
  │   └── 2 accent variables      (--color-accent-rgb, --color-accent-soft)
  │
  ├── localStorage.setItem()     ← Persist full ThemeConfig JSON
  │
  └── UI re-renders with new theme
```

**Color Derivation (`themes/utils.ts`):**

```typescript
deriveColors(core: { background, surface, border, accent, text, muted }) → ThemeColors
```

Takes 6 core colors, produces 20+ derived colors:
- `sidebar` = darken(background, 4%)
- `accentHover` = darken(accent, 12%)
- `accentMuted` = rgba(accent, 0.1)
- `base950` .. `base50` = gradient from background → text (blended with border/muted at intermediate stops)

**12 Built-in Themes:**

Original, Midnight, Terminal, Copper, Forest, Ocean, Lavender, Cyberpunk, GPT, Claude, Paper, Light

The ThemeModal has 3 tabs: Themes (grid of 12), Customize (color pickers, font, density, radius), Preview (mini chat mockup).

---

## 8. Data Model

```mermaid
erDiagram
    User ||--o{ Conversation : creates
    User ||--o{ ToolExecution : logs
    Conversation ||--o{ Message : contains
    Conversation ||--o{ ToolExecution : logs

    User {
        string id PK
        string email UK
        string password
        string fullName
        datetime createdAt
    }

    Conversation {
        string id PK
        string title "nullable"
        string type "chat | pdf"
        string userId FK
        datetime createdAt
    }

    Message {
        string id PK
        string conversationId FK
        string role "user | assistant"
        string content
        datetime createdAt
    }

    ToolExecution {
        string id PK
        string conversationId FK "nullable"
        string userId FK "nullable"
        string toolName
        string status "completed | failed"
        json input
        json output
        datetime startedAt
        datetime completedAt "nullable"
    }

    Memory {
        string id PK
        string userId
        string content
        string category
        datetime createdAt
    }
```

Key points:
- `Conversation.type` distinguishes regular chats (`"chat"`) from PDF conversations (`"pdf"`), enabling proper routing in the frontend history page
- PDF files are stored on disk at `uploads/pdfs/{documentId}.pdf` and served via `GET /api/pdf/:id/file`
- On conversation delete, the associated PDF file is also deleted from disk
- `ToolExecution` records every AI interaction (chat, vision, RAG, image analysis, debug) with input/output as JSON

---

## 9. Configuration & Environment

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/toolstack_ai` |
| `JWT_SECRET` | JWT signing secret | `fallback-secret` |
| `NVIDIA_API_KEY` | NVIDIA NIM API key | — |
| `NVIDIA_CHAT_MODEL` | Model for chat completions | `meta/llama-3.1-8b-instruct` |
| `NVIDIA_VISION_MODEL` | Model for vision/image analysis | `nvidia/nemotron-nano-12b-v2-vl` |
| `NVIDIA_EMBED_MODEL` | Model for embeddings | `nvidia/llama-nemotron-embed-vl-1b-v2` |
| `PORT` | Server port | `5001` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | API base path | `/api` |
| `VITE_API_TIMEOUT` | Global API timeout (ms) | `30000` |
| `VITE_STORAGE_TOKEN_KEY` | localStorage key for JWT | `toolstack_token` |
| `VITE_STORAGE_USER_KEY` | localStorage key for user | `toolstack_user` |
| `VITE_LOGIN_PATH` | Login route path | `/login` |
| `VITE_DASHBOARD_PATH` | Dashboard route path | `/dashboard` |
| `VITE_IMAGE_UPLOAD_TIMEOUT` | Image analysis timeout (ms) | `60000` |
| `VITE_PDF_UPLOAD_TIMEOUT` | PDF upload timeout (ms) | `120000` |
| `VITE_QUERY_RETRY` | React Query retry count | `1` |
| `VITE_QUERY_STALE_TIME` | React Query stale time (ms) | `30000` |
| `VITE_DEV_PORT` | Vite dev server port | `5173` |
| `VITE_API_PROXY_PATH` | Vite proxy path | `/api` |
| `VITE_API_PROXY_TARGET` | Vite proxy target | `http://localhost:5001` |

---

## 10. Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL running on localhost:5432
- NVIDIA API key (free at https://build.nvidia.com/)

### Setup

```bash
# 1. Clone and install
git clone <repo-url> && cd toolstack-ai

# 2. Backend
cd backend
cp .env.example .env     # Fill in DATABASE_URL, JWT_SECRET, NVIDIA_API_KEY
npm install
npx prisma migrate dev   # Run migrations
npm run dev              # Starts on port 5001

# 3. Frontend
cd frontend
cp .env.example .env     # Defaults work for local dev
npm install
npm run dev              # Starts on port 5173, proxies /api → :5001
```

### Verify

- Open `http://localhost:5173` → Landing page
- Register a new account → Redirects to dashboard
- Start a new chat → Type a message → See streaming response
- Attach an image in chat → See vision analysis
- Upload a PDF → Ask questions about it
- Use Image Analysis → See structured results
- Use Code Debugger → See bug reports
- Press `Cmd/Ctrl+Shift+T` → Open Theme Manager
