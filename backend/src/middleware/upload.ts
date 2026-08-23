import multer, { MulterError, FileFilterCallback } from "multer";
import { Request, Response, NextFunction } from "express";
import { ValidationError } from "../utils/apiError.js";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new ValidationError("Only JPEG, PNG, or WEBP images are allowed"));
      return;
    }
    cb(null, true);
  },
}).single("image");

/** Wraps multer's `.single("image")` so its errors (file-too-large, wrong type) surface as a clean
 *  400 via errorHandler.ts instead of an unhandled 500. */
export const uploadProfileImage = (req: Request, res: Response, next: NextFunction) => {
  upload(req, res, (err: unknown) => {
    if (!err) return next();

    if (err instanceof MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new ValidationError("Image must be 5MB or smaller"));
      }
      return next(new ValidationError(err.message));
    }
    next(err);
  });
};
