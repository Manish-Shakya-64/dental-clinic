import { Request, Response, NextFunction } from "express";
import { ApiError, ValidationError } from "../utils/apiError.js";
import { logger } from "../utils/logger.js";

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.originalUrl}`, code: "NOT_FOUND" },
  });
};

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    if (!err.isOperational) {
      logger.error({ err, requestId: req.requestId, route: req.originalUrl }, "Operational-but-unexpected error");
    }
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        ...(err instanceof ValidationError && err.fields ? { fields: err.fields } : {}),
      },
    });
    return;
  }

  logger.error(
    {
      err,
      stack: err.stack,
      requestId: req.requestId,
      route: req.originalUrl,
      userId: req.user?.userId,
      role: req.user?.role,
    },
    "Unhandled error",
  );

  res.status(500).json({
    error: { message: "Internal server error", code: "INTERNAL_ERROR" },
  });
};
