import multer from "multer";
import path from "node:path";
import fs from "node:fs";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

fs.mkdirSync(path.join(UPLOAD_DIR, "pdfs"), { recursive: true });
fs.mkdirSync(path.join(UPLOAD_DIR, "images"), { recursive: true });

export const pdfUpload = multer({
  dest: path.join(UPLOAD_DIR, "pdfs"),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(Object.assign(new Error("Only PDF files are allowed"), { statusCode: 400 }));
      return;
    }
    cb(null, true);
  },
});

export const imageUpload = multer({
  dest: path.join(UPLOAD_DIR, "images"),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      cb(Object.assign(new Error("Only JPEG, PNG, and WebP images are allowed"), { statusCode: 400 }));
      return;
    }
    cb(null, true);
  },
});
