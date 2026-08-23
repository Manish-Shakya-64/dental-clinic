import { Request, Response } from "express";
import { FilterQuery } from "mongoose";
import { AuditLog, IAuditLog } from "../models/AuditLog.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logAudit } from "../middleware/auditLogger.js";

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as {
    resourceType?: string;
    resourceId?: string;
    actorUserId?: string;
    action?: string;
    from?: Date;
    to?: Date;
    page: number;
    limit: number;
  };

  const filter: FilterQuery<IAuditLog> = {};
  if (query.resourceType) filter.resourceType = query.resourceType;
  if (query.resourceId) filter.resourceId = query.resourceId;
  if (query.actorUserId) filter["actor.userId"] = query.actorUserId;
  if (query.action) filter.action = query.action;
  if (query.from || query.to) {
    filter.timestamp = {};
    if (query.from) filter.timestamp.$gte = query.from;
    if (query.to) filter.timestamp.$lte = query.to;
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    AuditLog.countDocuments(filter),
  ]);

  await logAudit({ req, action: "AUDIT_LOG_VIEWED", resourceType: "AuditLog", status: "SUCCESS" });

  res.json({
    data: logs,
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  });
});
