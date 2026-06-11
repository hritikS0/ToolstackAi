import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getPrismaClient } from "../../shared/db/prismaClient.js";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const SALT_ROUNDS = 10;

const WELCOME_MESSAGE = `# 👋 Welcome to ToolStackAI!

ToolStackAI is your **AI-powered developer operating system** — chat with AI, analyze documents with RAG, manage tasks and projects, and build a knowledge base — all in one streamlined workspace.

---

## 🚀 Getting Started

### Connect an AI Provider
ToolStackAI supports multiple AI providers. Start by adding your API key:

- **NVIDIA NIM** (free tier) — Recommended for getting started
- **OpenAI** — GPT-4o, GPT-4.1
- **Anthropic** — Claude 3.5 Sonnet, Claude Opus
- **DeepSeek** — DeepSeek V3, DeepSeek R1
- **Google** — Gemini 2.0 Flash, Gemini 2.5 Pro
- **OpenRouter** — Access all providers through one API

---

## What You Can Do

| Feature | Description |
|---------|-------------|
| 💬 **AI Chat** | Streaming conversations with vision support — attach images and ask questions |
| 📄 **PDF Analysis** | Upload documents for RAG-powered Q&A with semantic search |
| ✅ **Tasks & Goals** | Track tasks with priorities, milestones, and due dates |
| 🧠 **Knowledge Brain** | Build a searchable second brain with AI-powered memory |
| 🔥 **Habits** | Build streaks, track completions, and visualize progress |
| 🎨 **Themes** | 12 fully customizable workspace themes |
| 📁 **Projects** | Organize work into projects with tasks, goals, and habits |
| 📝 **Notes** | Write and organize notes with tags and project linking |

---

**Add your API key below to unlock AI features, or explore the workspace first.**`;

export async function createWelcomeConversation(userId: string) {
  const prisma = getPrismaClient();

  const conversation = await prisma.conversation.create({
    data: {
      title: '👋 Welcome to ToolStackAI',
      userId,
      settings: { isWelcome: true },
    },
  });

  await prisma.message.create({
    data: {
      content: WELCOME_MESSAGE,
      conversationId: conversation.id,
      role: 'assistant',
    },
  });

  return conversation;
}

export async function registerUser(email: string, password: string , fullName : string) {
  const prisma = getPrismaClient();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw Object.assign(new Error("Email already registered"), { statusCode: 409 });
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, password: hashed , fullName },
  });

  let welcomeConversationId: string | null = null;
  try {
    const welcome = await createWelcomeConversation(user.id);
    welcomeConversationId = welcome.id;
  } catch (err) {
    console.error('Failed to create welcome conversation:', err);
  }

  const token = jwt.sign({ userId: user.id, email: user.email , fullName : user.fullName}, JWT_SECRET, {
    expiresIn: "7d",
  });

  return {
    token,
    user: { id: user.id,fullName : user.fullName,  email: user.email, createdAt: user.createdAt },
    welcomeConversationId,
  };
}

export async function loginUser(email: string, password: string) {
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw Object.assign(new Error("Invalid email or password"), { statusCode: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw Object.assign(new Error("Invalid email or password"), { statusCode: 401 });
  }

  const token = jwt.sign({ userId: user.id, email: user.email, fullName: user.fullName }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return { token, user: { id: user.id, fullName: user.fullName, email: user.email, createdAt: user.createdAt } };
}

export async function updateProfile(userId: string, updates: { fullName?: string }) {
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: updates.fullName || user.fullName,
    },
  });

  return { id: updated.id, email: updated.email, fullName: updated.fullName, createdAt: updated.createdAt };
}