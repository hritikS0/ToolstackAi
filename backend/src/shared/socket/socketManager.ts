import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { getPrismaClient } from "../db/prismaClient.js";

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token || typeof token !== "string") {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const secret = process.env.JWT_SECRET || "default_jwt_secret";
      const decoded = jwt.verify(token, secret) as { id: string };
      socket.data.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    if (userId) {
      const room = `user:${userId}`;
      socket.join(room);
      console.log(`Socket connected for user ${userId} (ID: ${socket.id})`);
    }

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.io has not been initialized yet!");
  }
  return io;
}

export async function createAndSendNotification(
  userId: string,
  data: {
    type: "mail" | "task" | "habit" | "system";
    title: string;
    message: string;
    link?: string;
  }
) {
  const prisma = getPrismaClient();

  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
      },
    });

    if (io) {
      io.to(`user:${userId}`).emit("new_notification", notification);
    }

    return notification;
  } catch (error) {
    console.error("Failed to create and send notification:", error);
    return null;
  }
}
