import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./shared/middleware/errorHandler.js";
import { requestLogger } from "./shared/middleware/request-logger.js";

const app = express();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

app.use(helmet());
app.use(cors());
app.use(limiter);
app.use(requestLogger);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    timeStamp: Date.now(),
    message: "ok",
  });
});

import authRoutes from "./features/auth/auth.routes.js";
import conversationRoutes from "./features/chat/conversation.routes.js";
import messageRoutes from "./features/chat/message.routes.js";
import pdfRoutes from "./features/pdf/pdf.routes.js";
import imageRoutes from "./features/image/image.routes.js";
import debugRoutes from "./features/debug/debug.routes.js";
import brainRoutes from "./features/brain/brain.routes.js";
import apiKeysRoutes from "./features/api-keys/api-keys.routes.js";
import dashboardRoutes from "./features/dashboard/dashboard.routes.js";
import mediaRoutes from "./features/media/media.routes.js";
import filesRoutes from "./features/files/files.routes.js";
import projectRoutes from "./features/projects/project.routes.js";

app.use("/api/auth", authRoutes);
app.use("/api/chat", conversationRoutes);
app.use("/api/chat", messageRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/image", imageRoutes);
app.use("/api/debug", debugRoutes);
app.use("/api/brain", brainRoutes);
app.use("/api/keys", apiKeysRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/projects", projectRoutes);

app.use(errorHandler);

export default app;
