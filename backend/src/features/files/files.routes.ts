import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import { imageUpload } from "../../shared/utils/multer.js";
import * as filesController from "./files.controller.js";

const router = Router();

router.get("/", authenticate, filesController.getFiles);
router.get("/:id", authenticate, filesController.getFile);
router.post("/upload", authenticate, imageUpload.single("file"), filesController.uploadFile);
router.delete("/:id", authenticate, filesController.deleteFile);

export default router;
