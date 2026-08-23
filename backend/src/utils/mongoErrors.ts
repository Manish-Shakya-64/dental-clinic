interface MongoDuplicateKeyError {
  code: number;
  keyPattern?: Record<string, unknown>;
}

export function isDuplicateKeyError(err: unknown): err is MongoDuplicateKeyError {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === 11000;
}

/** True if the duplicate-key error was caused by the given field (e.g. "appointment_code"). */
export function duplicateKeyIsOn(err: MongoDuplicateKeyError, field: string): boolean {
  return Boolean(err.keyPattern && field in err.keyPattern);
}
