import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import { getBriefingHandler } from "./briefing.controller.js";

const router = Router();

router.get("/", authenticate, getBriefingHandler);

export default router;
