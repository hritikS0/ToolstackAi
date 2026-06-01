import { Router } from "express";
import { uploadPdf, chatWithPdf, getPdfFile } from "./pdf.controller.js";
import { authenticate } from "../../shared/middleware/auth.middleware.js";
import { pdfUpload } from "../../shared/utils/multer.js";

const router = Router();

router.post("/upload", authenticate, pdfUpload.single("file"), uploadPdf);
router.post("/chat", authenticate, chatWithPdf);
router.get("/:id/file", authenticate, getPdfFile);

export default router;
