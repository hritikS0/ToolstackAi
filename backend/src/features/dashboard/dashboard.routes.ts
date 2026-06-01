import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import { getDashboardHandler } from "./dashboard.controller.js";

const router = Router();

router.get("/", authenticate, getDashboardHandler);

export default router;
