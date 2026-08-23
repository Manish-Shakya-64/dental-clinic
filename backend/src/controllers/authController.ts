import crypto from "node:crypto";
import { Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User, IUser } from "../models/User.js";
import { Patient } from "../models/Patient.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ConflictError, UnauthorizedError, ValidationError } from "../utils/apiError.js";
import { blindIndex } from "../utils/blindIndex.js";
import { logAudit } from "../middleware/auditLogger.js";
import { sendEmail } from "../services/emailService.js";
import { buildSimpleEmailHtml } from "../services/emailTemplates.js";
import { logger } from "../utils/logger.js";
import { JWTAccessPayload, JWTRefreshPayload } from "../types/auth.types.js";

const SALT_ROUNDS = 12;

function signAccessToken(payload: JWTAccessPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as SignOptions);
}

function signRefreshToken(payload: JWTRefreshPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as SignOptions);
}

function buildAccessPayload(user: IUser): JWTAccessPayload {
  return {
    sub: user._id.toString(),
    role: user.role,
    patientId: user.patient?.toString(),
    staffId: user.staff?.toString(),
    practitionerId: user.practitioner?.toString(),
  };
}

/** Patient self-registration. Staff/doctor accounts are created by an Admin via POST /staff instead
 *  — the spec's endpoint table has no patient signup route, so this fills that gap (documented in
 *  README) since the system can't function without one. */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { first_name, middle_name, last_name, gender, email, password, phone, dob, address } = req.body;

  const existing = await User.findOne({ email_hash: blindIndex(email) });
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const patient = await Patient.create({
    first_name,
    middle_name,
    last_name,
    gender,
    email,
    phone,
    dob: (dob as Date).toISOString().slice(0, 10),
    address,
  });

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    email,
    password_hash,
    role: "PATIENT",
    patient: patient._id,
  });

  res.status(201).json({
    data: { id: user._id.toString(), email: patient.email, role: user.role, patientId: patient._id.toString() },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email_hash: blindIndex(email) }).select(
    "+password_hash +token_version email role is_active patient staff practitioner",
  );

  if (!user || !user.is_active) {
    await logAudit({ req, action: "LOGIN_FAILURE", resourceType: "User", status: "FAILURE", actorDisplayName: email });
    throw new UnauthorizedError("Invalid credentials");
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    await logAudit({
      req,
      action: "LOGIN_FAILURE",
      resourceType: "User",
      resourceId: user._id.toString(),
      status: "FAILURE",
      actorDisplayName: email,
    });
    throw new UnauthorizedError("Invalid credentials");
  }

  user.last_login_at = new Date();
  await user.save();

  await logAudit({
    req,
    action: "LOGIN_SUCCESS",
    resourceType: "User",
    resourceId: user._id.toString(),
    status: "SUCCESS",
    actorDisplayName: user.email,
    actorRole: user.role,
  });

  const accessToken = signAccessToken(buildAccessPayload(user));
  const refreshToken = signRefreshToken({ sub: user._id.toString(), tokenVersion: user.token_version });

  res.json({
    data: {
      accessToken,
      refreshToken,
      user: { id: user._id.toString(), email: user.email, role: user.role },
    },
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  let payload: JWTRefreshPayload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JWTRefreshPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const user = await User.findById(payload.sub).select("+token_version role is_active patient staff practitioner");
  if (!user || !user.is_active || user.token_version !== payload.tokenVersion) {
    throw new UnauthorizedError("Refresh token has been invalidated");
  }

  const accessToken = signAccessToken(buildAccessPayload(user));
  res.json({ data: { accessToken } });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId).select("+token_version");
  if (user) {
    user.token_version += 1;
    await user.save();
  }

  await logAudit({ req, action: "LOGOUT", resourceType: "User", resourceId: req.user!.userId, status: "SUCCESS" });
  res.json({ data: { message: "Logged out" } });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const genericResponse = { data: { message: "If that account exists, a reset link has been sent" } };

  const user = await User.findOne({ email_hash: blindIndex(email) });
  if (!user) {
    res.json(genericResponse);
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  user.reset_token_hash = tokenHash;
  user.reset_token_expires = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60_000);
  await user.save();

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;
  try {
    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      text: `Reset your password using this link: ${resetUrl}\nThis link expires in ${env.PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes.`,
      html: buildSimpleEmailHtml({
        headline: "Reset your password",
        bodyHtml: `<p style="margin:0 0 20px;">We received a request to reset your Bright Smile Dental account password. Click the button below to choose a new one — this link expires in ${env.PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes.</p>`,
        buttonLabel: "Reset password",
        buttonUrl: resetUrl,
        footerHtml: `<p style="margin:20px 0 0;">If you didn't request this, you can safely ignore this email — your password won't be changed.</p>`,
      }),
    });
  } catch (err) {
    // Don't let a transient email failure 500 the request — that would also leak account
    // existence through the error response, defeating genericResponse's whole point below.
    logger.error({ err, userId: user._id.toString() }, "Failed to send password reset email");
  }

  await logAudit({
    req,
    action: "PASSWORD_RESET_REQUESTED",
    resourceType: "User",
    resourceId: user._id.toString(),
    status: "SUCCESS",
    actorDisplayName: user.email,
  });

  res.json(genericResponse);
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({ reset_token_hash: tokenHash }).select(
    "+reset_token_hash +reset_token_expires +token_version",
  );

  if (!user || !user.reset_token_expires || user.reset_token_expires.getTime() < Date.now()) {
    throw new ValidationError("Invalid or expired reset token");
  }

  user.password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.reset_token_hash = null;
  user.reset_token_expires = null;
  user.token_version += 1;
  await user.save();

  await logAudit({
    req,
    action: "PASSWORD_RESET_COMPLETED",
    resourceType: "User",
    resourceId: user._id.toString(),
    status: "SUCCESS",
    actorDisplayName: user.email,
  });

  res.json({ data: { message: "Password has been reset" } });
});
