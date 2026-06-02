import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import * as ctrl from "./project.controller.js";

const router = Router();

router.get("/", authenticate, ctrl.listProjects);
router.post("/", authenticate, ctrl.createProject);
router.get("/:id", authenticate, ctrl.getProject);
router.patch("/:id", authenticate, ctrl.updateProject);
router.delete("/:id", authenticate, ctrl.deleteProject);

router.get("/:projectId/threads", authenticate, ctrl.listThreads);
router.post("/threads", authenticate, ctrl.createThread);
router.get("/threads/:id", authenticate, ctrl.getThread);
router.patch("/threads/:id", authenticate, ctrl.updateThread);
router.delete("/threads/:id", authenticate, ctrl.deleteThread);

router.post("/threads/link", authenticate, ctrl.linkConversation);

export default router;
