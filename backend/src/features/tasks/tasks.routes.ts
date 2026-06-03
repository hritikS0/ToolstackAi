import { Router } from "express";
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  aiCreateTask,
  aiSuggestPriorities,
} from "./tasks.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createTask);
router.get("/", authenticate, getTasks);
router.get("/ai-suggestions", authenticate, aiSuggestPriorities);
router.post("/ai-create", authenticate, aiCreateTask);
router.get("/:id", authenticate, getTask);
router.patch("/:id", authenticate, updateTask);
router.delete("/:id", authenticate, deleteTask);

export default router;
