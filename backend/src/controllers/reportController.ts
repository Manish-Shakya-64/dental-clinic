import { Request, Response } from "express";
import * as reportService from "../services/reportService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logAudit } from "../middleware/auditLogger.js";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as { from?: Date; to?: Date };
  const to = query.to ?? new Date();
  const from = query.from ?? new Date(to.getTime() - THIRTY_DAYS_MS);

  const dashboard = await reportService.getDashboard(from, to);

  await logAudit({ req, action: "REPORT_VIEWED", resourceType: "Report", status: "SUCCESS" });
  res.json({ data: dashboard });
});
