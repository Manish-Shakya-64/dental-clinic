import { Request, Response, NextFunction } from "express";

/**
 * Injects a top-level `success: true|false` into every JSON response, derived from the status
 * code, without touching every controller's res.json(...) call individually. Applied once, early,
 * in app.ts — errorHandler.ts's res.json(...) calls run later in the same request and pick up the
 * same patched res.json, so both success (`{ data, success: true }`) and error
 * (`{ error, success: false }`) shapes are covered by this one place.
 */
export const responseWrapper = (_req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);

  res.json = (body?: unknown) => {
    if (body && typeof body === "object" && !Array.isArray(body) && !("success" in body)) {
      (body as Record<string, unknown>).success = res.statusCode < 400;
    }
    return originalJson(body);
  };

  next();
};
