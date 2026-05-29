import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./shared/middleware/errorHandler.js";

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Routes
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    timeStamp: Date.now(),
    message: "ok",
  });
});

import authRoutes from "./features/auth/auth.routes.js";
import conversationRoutes from "./features/chat/conversation.routes.js";
import messageRoutes from "./features/chat/message.routes.js";

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", conversationRoutes);
app.use("/api/chat", messageRoutes);

// Global error handler (must be registered last)
app.use(errorHandler);

export default app;
