import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import * as keysController from "./api-keys.controller.js";

const router = Router();

router.get("/status", authenticate, keysController.getStatus);
router.get("/", authenticate, keysController.getKeys);
router.post("/", authenticate, keysController.saveKey);
router.post("/test", authenticate, keysController.testKey);
router.delete("/:provider", authenticate, keysController.deleteKey);

export default router;
