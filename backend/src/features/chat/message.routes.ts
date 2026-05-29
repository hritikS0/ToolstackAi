import express from "express";
const router = express.Router();
import { createMessage, getMessage } from "./message.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
router.post("/message", authenticate, createMessage);
router.get("/message", authenticate, getMessage);

export default router;
