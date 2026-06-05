import { Router } from "express";
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
} from "./projects.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, createProject);
router.get("/", authenticate, getProjects);
router.get("/:id", authenticate, getProject);
router.patch("/:id", authenticate, updateProject);
router.delete("/:id", authenticate, deleteProject);

export default router;
