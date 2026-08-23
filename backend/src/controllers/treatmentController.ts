import { Request, Response } from "express";
import { Treatment } from "../models/Treatment.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/apiError.js";
import { logAudit } from "../middleware/auditLogger.js";

export const listTreatments = asyncHandler(async (_req: Request, res: Response) => {
  const treatments = await Treatment.find({ is_active: true }).sort({ label: 1 });
  res.json({ data: treatments });
});

export const createTreatment = asyncHandler(async (req: Request, res: Response) => {
  const treatment = await Treatment.create(req.body);
  await logAudit({ req, action: "TREATMENT_PRICE_UPDATED", resourceType: "Treatment", resourceId: treatment._id.toString(), status: "SUCCESS", metadata: { created: true } });
  res.status(201).json({ data: treatment });
});

export const updateTreatment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const treatment = await Treatment.findById(id);
  if (!treatment) throw new NotFoundError("Treatment not found");

  const changedFields = Object.keys(req.body);
  Object.assign(treatment, req.body);
  await treatment.save();

  await logAudit({
    req,
    action: "TREATMENT_PRICE_UPDATED",
    resourceType: "Treatment",
    resourceId: id,
    status: "SUCCESS",
    metadata: { changedFields },
  });
  res.json({ data: treatment });
});
