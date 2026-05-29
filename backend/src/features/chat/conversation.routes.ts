import { Router } from "express";
import { getConversations ,createConversation } from "./conversation.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";

const router = Router();

router.get("/conversations", authenticate,getConversations);
router.post("/conversations", authenticate,createConversation);


export default router;
