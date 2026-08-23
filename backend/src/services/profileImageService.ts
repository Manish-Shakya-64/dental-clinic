import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// Resolved against process.cwd(), which npm (dev/start/seed/test) always sets to the backend/
// package root, so this is correct whether running src/ via tsx or dist/ via node.
export const UPLOAD_DIR = path.join(process.cwd(), "uploads", "profile-images");

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/** Writes the buffer under a random filename (never the client-supplied name) and returns it. */
export async function saveProfileImage(buffer: Buffer, mimetype: string): Promise<string> {
  const extension = EXTENSION_BY_MIME_TYPE[mimetype];
  if (!extension) {
    throw new Error(`Unsupported image mime type: ${mimetype}`);
  }

  await ensureUploadDir();
  const filename = `${crypto.randomUUID()}.${extension}`;
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return filename;
}

/** Deletes a previously saved image; silently no-ops if it's already gone. */
export async function deleteProfileImageFile(filename: string): Promise<void> {
  try {
    await fs.unlink(path.join(UPLOAD_DIR, filename));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

export function getProfileImageAbsolutePath(filename: string): string {
  return path.join(UPLOAD_DIR, filename);
}

export function getContentTypeForFilename(filename: string): string {
  const extension = path.extname(filename).slice(1).toLowerCase();
  return MIME_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";
}
