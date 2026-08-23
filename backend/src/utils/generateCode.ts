import crypto from "node:crypto";

const datePart = (date: Date): string => {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
};

const randomSuffix = (): string =>
  crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 4);

/** Generates e.g. "APT-20260813-4F2A" — a 4-char random base36-ish suffix, not a strict sequence.
 *  Uniqueness is enforced by the model's unique index; callers should retry on a duplicate-key error. */
export function generateCode(prefix: "APT" | "BILL", date: Date = new Date()): string {
  return `${prefix}-${datePart(date)}-${randomSuffix()}`;
}
