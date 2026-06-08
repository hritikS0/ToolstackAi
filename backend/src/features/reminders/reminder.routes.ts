import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import * as reminderController from "./reminder.controller.js";

const router = Router();

router.get("/", authenticate, reminderController.getReminders);
router.post("/", authenticate, reminderController.createReminder);
router.patch("/:id", authenticate, reminderController.updateReminder);
router.delete("/:id", authenticate, reminderController.deleteReminder);

export default router;
