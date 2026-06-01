export class StorageError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode = 500, code = "STORAGE_ERROR") {
    super(message);
    this.name = "StorageError";
    this.statusCode = statusCode;
    this.code = code;
  }

  static uploadFailed(detail?: string) {
    return new StorageError(detail || "File upload failed", 500, "UPLOAD_FAILED");
  }

  static notFound(id?: string) {
    return new StorageError(id ? `File not found: ${id}` : "File not found", 404, "NOT_FOUND");
  }

  static permissionDenied() {
    return new StorageError("Permission denied for this file", 403, "PERMISSION_DENIED");
  }

  static invalidType(allowed: string[]) {
    return new StorageError(`Invalid file type. Allowed: ${allowed.join(", ")}`, 400, "INVALID_TYPE");
  }

  static fileTooLarge(maxMB: number) {
    return new StorageError(`File too large. Maximum: ${maxMB}MB`, 400, "FILE_TOO_LARGE");
  }
}

const ALLOWED_MIME: Record<string, { types: string[]; maxSize: number }> = {
  pdfs: { types: ["application/pdf"], maxSize: 10 * 1024 * 1024 },
  images: { types: ["image/jpeg", "image/png", "image/webp", "image/gif"], maxSize: 10 * 1024 * 1024 },
  avatars: { types: ["image/jpeg", "image/png", "image/webp"], maxSize: 2 * 1024 * 1024 },
  exports: { types: ["application/json", "text/csv"], maxSize: 50 * 1024 * 1024 },
};

export function validateFileUpload(file: { mimetype: string; size: number }, bucket: string) {
  const rules = ALLOWED_MIME[bucket];
  if (!rules) throw new StorageError(`Unknown bucket: ${bucket}`, 400, "INVALID_BUCKET");

  if (!rules.types.includes(file.mimetype)) {
    throw StorageError.invalidType(rules.types);
  }

  if (file.size > rules.maxSize) {
    throw StorageError.fileTooLarge(Math.round(rules.maxSize / (1024 * 1024)));
  }
}
