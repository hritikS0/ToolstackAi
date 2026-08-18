import { getPrismaClient } from "../../shared/db/prismaClient.js";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { simpleParser } from "mailparser";
import { categorizeThread } from "./mail-ai.service.js";
import { createAndSendNotification } from "../../shared/socket/socketManager.js";

export interface CreateAccountInput {
  email: string;
  displayName?: string;
  provider?: string;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  username?: string;
  password?: string;
}

export async function createEmailAccount(userId: string, data: CreateAccountInput) {
  const prisma = getPrismaClient();

  // If provider is gmail/outlook and hosts aren't provided, set defaults
  let imapHost = data.imapHost;
  let imapPort = data.imapPort || 993;
  let smtpHost = data.smtpHost;
  let smtpPort = data.smtpPort || 465;

  if (data.provider === "gmail") {
    imapHost = imapHost || "imap.gmail.com";
    smtpHost = smtpHost || "smtp.gmail.com";
  } else if (data.provider === "outlook") {
    imapHost = imapHost || "outlook.office365.com";
    smtpHost = smtpHost || "smtp.office365.com";
    smtpPort = data.smtpPort || 587;
  }

  // Check if it's the first account for user to make default
  const count = await prisma.emailAccount.count({ where: { userId } });

  return prisma.emailAccount.create({
    data: {
      userId,
      email: data.email,
      displayName: data.displayName || data.email,
      provider: data.provider || "imap",
      imapHost,
      imapPort,
      smtpHost,
      smtpPort,
      username: data.username || data.email,
      encryptedPassword: data.password || "", // stored securely
      isDefault: count === 0,
    },
  });
}

export async function getUserEmailAccounts(userId: string) {
  const prisma = getPrismaClient();
  return prisma.emailAccount.findMany({
    where: { userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      provider: true,
      imapHost: true,
      imapPort: true,
      smtpHost: true,
      smtpPort: true,
      isDefault: true,
      lastSyncedAt: true,
      createdAt: true,
    },
  });
}

export async function deleteEmailAccount(userId: string, accountId: string) {
  const prisma = getPrismaClient();
  return prisma.emailAccount.deleteMany({
    where: { id: accountId, userId },
  });
}

export async function testConnection(data: CreateAccountInput) {
  const imapHost = data.imapHost || (data.provider === "gmail" ? "imap.gmail.com" : "outlook.office365.com");
  const imapPort = data.imapPort || 993;
  const username = data.username || data.email;
  const password = data.password || "";

  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: true,
    auth: {
      user: username,
      pass: password,
    },
    logger: false,
  });

  try {
    await client.connect();
    await client.logout();
    return { success: true, message: "Connection successful!" };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to connect via IMAP" };
  }
}

export async function syncEmailAccount(userId: string, accountId: string, limit: number = 20) {
  const prisma = getPrismaClient();

  const account = await prisma.emailAccount.findFirst({
    where: { id: accountId, userId },
  });

  if (!account || !account.encryptedPassword || !account.imapHost) {
    throw new Error("Account configuration or password missing.");
  }

  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort || 993,
    secure: true,
    auth: {
      user: account.username || account.email,
      pass: account.encryptedPassword,
    },
    logger: false,
  });

  const syncedMessages = [];
  const newlyCreatedThreadIds = new Set<string>();

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const status = await client.status("INBOX", { messages: true });
      const totalMessages = status.messages || 0;

      if (totalMessages > 0) {
        const startSeq = Math.max(1, totalMessages - limit + 1);

        for await (const message of client.fetch(`${startSeq}:*`, {
          envelope: true,
          source: true,
          flags: true,
          uid: true,
        })) {
          if (!message.source) continue;

          const parsed = await simpleParser(message.source);

          const messageId = parsed.messageId || `msg_${message.uid}_${Date.now()}`;
          const subject = parsed.subject || "(No Subject)";
          const fromAddress = parsed.from?.value[0]?.address || "unknown@domain.com";
          const fromName = parsed.from?.value[0]?.name || fromAddress;
          const toAddresses = parsed.to ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]).flatMap(t => t.value.map(v => v.address || "")).filter(Boolean) : [];
          const bodyText = parsed.text || "";
          const bodyHtml = typeof parsed.html === "string" ? parsed.html : undefined;
          const snippet = bodyText.substring(0, 150).replace(/\s+/g, " ").trim();
          const sentAt = parsed.date || new Date();

          // Check if message already exists
          const existingMessage = await prisma.emailMessage.findFirst({
            where: { accountId, messageId },
          });

          if (existingMessage) continue;

          // Group into Thread by normalized subject
          const cleanSubject = subject.replace(/^(Re|Fwd|FW|RE):\s*/i, "").trim();

          let thread = await prisma.emailThread.findFirst({
            where: {
              accountId,
              subject: { equals: cleanSubject, mode: "insensitive" },
            },
          });

          if (!thread) {
            thread = await prisma.emailThread.create({
              data: {
                accountId,
                subject: cleanSubject,
                snippet,
                lastMessageAt: sentAt,
              },
            });
            newlyCreatedThreadIds.add(thread.id);
          } else {
            await prisma.emailThread.update({
              where: { id: thread.id },
              data: {
                snippet,
                lastMessageAt: sentAt,
                isRead: false,
              },
            });
            newlyCreatedThreadIds.add(thread.id);
          }

          const createdMsg = await prisma.emailMessage.create({
            data: {
              threadId: thread.id,
              accountId,
              messageId,
              fromAddress,
              fromName,
              toAddresses,
              subject,
              bodyText,
              bodyHtml,
              sentAt,
            },
          });

          syncedMessages.push(createdMsg);
        }
      }

      await prisma.emailAccount.update({
        where: { id: accountId },
        data: { lastSyncedAt: new Date() },
      });
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (error: any) {
    console.error("IMAP Sync Error:", error);
    throw new Error(error.message || "Failed to sync inbox via IMAP");
  }

  // Auto-categorize newly created/updated threads asynchronously in background
  if (newlyCreatedThreadIds.size > 0) {
    setTimeout(async () => {
      for (const threadId of newlyCreatedThreadIds) {
        try {
          await categorizeThread(userId, threadId);
        } catch (err) {
          console.error(`Background auto-categorize failed for thread ${threadId}:`, err);
        }
      }
    }, 50);
  }

  if (syncedMessages.length > 0) {
    const latest = syncedMessages[0];
    createAndSendNotification(userId, {
      type: "mail",
      title: `New Email: ${latest.subject}`,
      message: `From ${latest.fromName || latest.fromAddress} (${syncedMessages.length} new message(s))`,
      link: "/mail",
    }).catch(err => console.error("Notification error:", err));
  }

  return { syncedCount: syncedMessages.length };
}

export async function sendEmail(
  userId: string,
  data: {
    accountId: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    bodyText: string;
    bodyHtml?: string;
    threadId?: string;
  }
) {
  const prisma = getPrismaClient();

  const account = await prisma.emailAccount.findFirst({
    where: { id: data.accountId, userId },
  });

  if (!account || !account.smtpHost || !account.encryptedPassword) {
    throw new Error("Email account SMTP configuration is invalid.");
  }

  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort || 465,
    secure: account.smtpPort === 465,
    auth: {
      user: account.username || account.email,
      pass: account.encryptedPassword,
    },
  });

  const info = await transporter.sendMail({
    from: `"${account.displayName || account.email}" <${account.email}>`,
    to: data.to.join(", "),
    cc: data.cc?.join(", "),
    bcc: data.bcc?.join(", "),
    subject: data.subject,
    text: data.bodyText,
    html: data.bodyHtml,
  });

  // Store in DB under thread or new thread
  let threadId = data.threadId;
  if (!threadId) {
    const thread = await prisma.emailThread.create({
      data: {
        accountId: account.id,
        subject: data.subject,
        snippet: data.bodyText.substring(0, 150),
        lastMessageAt: new Date(),
      },
    });
    threadId = thread.id;
  }

  const message = await prisma.emailMessage.create({
    data: {
      threadId,
      accountId: account.id,
      messageId: info.messageId || `sent_${Date.now()}`,
      fromAddress: account.email,
      fromName: account.displayName || account.email,
      toAddresses: data.to,
      ccAddresses: data.cc || [],
      bccAddresses: data.bcc || [],
      subject: data.subject,
      bodyText: data.bodyText,
      bodyHtml: data.bodyHtml,
      sentAt: new Date(),
    },
  });

  return { messageId: info.messageId, message };
}

export async function getThreads(
  userId: string,
  filters?: { accountId?: string; category?: string; search?: string; page?: number; limit?: number }
) {
  const prisma = getPrismaClient();

  const page = Math.max(1, Number(filters?.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filters?.limit) || 15));
  const skip = (page - 1) * limit;

  const where: any = {
    account: { userId },
  };

  if (filters?.accountId) where.accountId = filters.accountId;
  
  if (filters?.category && filters.category !== "all") {
    if (filters.category === "sent") {
      const userAccounts = await prisma.emailAccount.findMany({
        where: { userId },
        select: { email: true },
      });
      const emails = userAccounts.map(a => a.email);
      where.messages = {
        some: {
          fromAddress: { in: emails },
        },
      };
    } else {
      where.category = filters.category;
    }
  }

  if (filters?.search) {
    where.OR = [
      { subject: { contains: filters.search, mode: "insensitive" } },
      { snippet: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [total, threads] = await Promise.all([
    prisma.emailThread.count({ where }),
    prisma.emailThread.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      skip,
      take: limit,
      include: {
        account: {
          select: { email: true, displayName: true },
        },
        messages: {
          orderBy: { sentAt: "asc" },
          take: 1, // latest preview or first message
        },
      },
    }),
  ]);

  return {
    threads,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getThreadDetails(userId: string, threadId: string) {
  const prisma = getPrismaClient();

  const thread = await prisma.emailThread.findFirst({
    where: { id: threadId, account: { userId } },
    include: {
      account: {
        select: { id: true, email: true, displayName: true },
      },
      messages: {
        orderBy: { sentAt: "asc" },
      },
    },
  });

  if (thread && !thread.isRead) {
    await prisma.emailThread.update({
      where: { id: threadId },
      data: { isRead: true },
    });
  }

  return thread;
}
