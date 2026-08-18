import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import * as notificationsController from "./notifications.controller.js";

const router = Router();

router.get("/", authenticate, notificationsController.getNotificationsHandler);
router.patch("/read-all", authenticate, notificationsController.markAllAsReadHandler);
router.patch("/:id/read", authenticate, notificationsController.markAsReadHandler);
router.delete("/clear", authenticate, notificationsController.clearNotificationsHandler);

export default router;
