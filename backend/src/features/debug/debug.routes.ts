import { Router } from "express";
import { debugCode } from "./debug.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, debugCode);

export default router;
