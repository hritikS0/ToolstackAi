import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import * as notificationController from "./notification.controller.js";

const router = Router();

router.get("/preferences", authenticate, notificationController.getPreferences);
router.patch("/preferences", authenticate, notificationController.updatePreferences);
router.patch("/read-all", authenticate, notificationController.markAllAsRead);
router.delete("/clear-read", authenticate, notificationController.clearRead);
router.get("/count", authenticate, notificationController.getNotificationCount);
router.patch("/:id/read", authenticate, notificationController.markAsRead);
router.get("/", authenticate, notificationController.getNotifications);

export default router;
