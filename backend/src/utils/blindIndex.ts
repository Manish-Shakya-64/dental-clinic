import crypto from "node:crypto";
import { env } from "../config/env.js";

/** Hex-encoded HMAC-SHA256 of the trimmed/lowercased value, for exact-match lookups on encrypted fields. */
export function blindIndex(value: string): string {
  const normalized = value.trim().toLowerCase();
  return crypto.createHmac("sha256", env.BLIND_INDEX_SECRET).update(normalized).digest("hex");
}
