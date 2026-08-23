import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { UnauthorizedError } from "../utils/apiError.js";
import { JWTAccessPayload } from "../types/auth.types.js";

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      throw new UnauthorizedError("No token provided");
    }

    let payload: JWTAccessPayload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JWTAccessPayload;
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }

    // Re-checked per request (not just at token-issue time) so a deactivated account is rejected
    // immediately rather than waiting out the access token's remaining lifetime.
    const user = await User.findById(payload.sub).select("role is_active patient staff practitioner");
    if (!user || !user.is_active) {
      throw new UnauthorizedError("Account is inactive or no longer exists");
    }

    req.user = {
      userId: user._id.toString(),
      role: user.role,
      patientId: user.patient?.toString(),
      staffId: user.staff?.toString(),
      practitionerId: user.practitioner?.toString(),
    };
    next();
  } catch (err) {
    next(err);
  }
};
