import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import * as habitsController from "./habits.controller.js";

const router = Router();

router.post("/", authenticate, habitsController.createHabit);
router.get("/", authenticate, habitsController.getHabits);
router.get("/:id/stats", authenticate, habitsController.getHabitStats);
router.patch("/:id", authenticate, habitsController.updateHabit);
router.delete("/:id", authenticate, habitsController.deleteHabit);
router.post("/:id/complete", authenticate, habitsController.completeHabit);
router.post("/ai-create", authenticate, habitsController.aiCreateHabit);
router.get("/ai-insights", authenticate, habitsController.aiAnalyzeHabits);

export default router;
