import { Request, Response, NextFunction } from "express";
import { Role } from "../types/auth.types.js";
import { ForbiddenError, UnauthorizedError } from "../utils/apiError.js";

export const authorize = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError("Not authenticated"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError("Insufficient permissions"));
    }

    next();
  };
};
