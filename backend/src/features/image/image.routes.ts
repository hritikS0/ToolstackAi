import { Router } from "express";
import { analyzeImage } from "./image.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import { imageUpload } from "../../shared/utils/multer.js";

const router = Router();

router.post("/analyze", authenticate, imageUpload.single("image"), analyzeImage);

export default router;
