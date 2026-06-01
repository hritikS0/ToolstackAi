import { Router } from "express";
import { getConversations, createConversation, deleteConversation, updateConversation } from "./conversation.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";

const router = Router();

router.get("/conversations", authenticate, getConversations);
router.post("/conversations", authenticate, createConversation);
router.delete("/conversations/:id", authenticate, deleteConversation);
router.patch("/conversations/:id", authenticate, updateConversation);

export default router;
