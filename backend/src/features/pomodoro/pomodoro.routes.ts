import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import * as pomodoroController from "./pomodoro.controller.js";

const router = Router();

router.post("/sessions", authenticate, pomodoroController.createSession);
router.get("/sessions", authenticate, pomodoroController.listSessions);
router.get("/stats", authenticate, pomodoroController.getStats);

export default router;
