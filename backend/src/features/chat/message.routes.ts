import express from "express";
const router = express.Router();
import { createMessage, getMessage } from "./message.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import { streamChatHandler } from "./stream.controller.js";
import { visionChatHandler } from "./vision.controller.js";
import { imageUpload } from "../../shared/utils/multer.js";

router.post("/message", authenticate, createMessage);
router.get("/message", authenticate, getMessage);
router.post("/stream", authenticate, streamChatHandler);
router.post("/vision", authenticate, imageUpload.single("image"), visionChatHandler);

export default router;
