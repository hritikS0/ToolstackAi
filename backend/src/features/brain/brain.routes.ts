import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import * as brainController from "./brain.controller.js";

const router = Router();

router.get("/dashboard", authenticate, brainController.getDashboard);
router.get("/memories", authenticate, brainController.getMemories);
router.get("/memories/:id", authenticate, brainController.getMemory);
router.post("/memories", authenticate, brainController.createMemory);
router.patch("/memories/:id", authenticate, brainController.updateMemory);
router.delete("/memories/:id", authenticate, brainController.deleteMemory);
router.get("/settings", authenticate, brainController.getSettings);
router.patch("/settings", authenticate, brainController.updateSettings);
router.delete("/memories", authenticate, brainController.deleteAllMemories);

export default router;
