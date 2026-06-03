import { Router } from "express";
import {
  createGoal,
  getGoals,
  getGoal,
  updateGoal,
  deleteGoal,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  aiSuggestMilestones,
  aiAnalyzeProgress,
} from "./goals.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createGoal);
router.get("/", authenticate, getGoals);
router.get("/:id", authenticate, getGoal);
router.patch("/:id", authenticate, updateGoal);
router.delete("/:id", authenticate, deleteGoal);
router.post("/:id/milestones", authenticate, addMilestone);
router.patch("/:id/milestones/:mid", authenticate, updateMilestone);
router.delete("/:id/milestones/:mid", authenticate, deleteMilestone);
router.post("/:id/ai-milestones", authenticate, aiSuggestMilestones);
router.get("/:id/ai-analysis", authenticate, aiAnalyzeProgress);

export default router;
