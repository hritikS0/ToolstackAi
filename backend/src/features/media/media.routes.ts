import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import * as mediaController from "./media.controller.js";

const router = Router();

router.get("/", authenticate, mediaController.getMedia);
router.get("/file/:id", authenticate, mediaController.serveMediaFile);
router.delete("/:id", authenticate, mediaController.deleteMedia);

export default router;
