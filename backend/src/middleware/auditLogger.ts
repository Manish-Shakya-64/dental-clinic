import { Request } from "express";
import { Types } from "mongoose";
import { AuditLog, AuditStatus } from "../models/AuditLog.js";
import { Role } from "../types/auth.types.js";

export interface LogAuditParams {
  req: Request;
  action: string;
  resourceType: string;
  resourceId?: string;
  status: AuditStatus;
  metadata?: Record<string, unknown>;
  /** Overrides the actor's display name — e.g. an attempted login email when there's no req.user yet. */
  actorDisplayName?: string;
  /** Overrides the actor's role — e.g. the account's real role during login, before req.user exists. */
  actorRole?: Role | "SYSTEM";
}

/**
 * Writes an AuditLog entry. Called explicitly from controllers/services at the point a §7.2
 * action actually occurs (success or failure), rather than generically at route entry, since most
 * audited actions are business outcomes, not route hits. Intentionally does not swallow write
 * failures — an audit trail that can silently fail isn't one, so a broken write surfaces as a 500.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  const { req, action, resourceType, resourceId, status, metadata, actorDisplayName, actorRole } = params;

  await AuditLog.create({
    timestamp: new Date(),
    actor: {
      userId: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
      role: actorRole ?? req.user?.role ?? "SYSTEM",
      displayName: actorDisplayName ?? req.user?.role ?? "unknown",
    },
    action,
    resourceType,
    resourceId: resourceId ? new Types.ObjectId(resourceId) : null,
    status,
    ip_address: req.ip,
    user_agent: req.headers["user-agent"],
    metadata,
  });
}
