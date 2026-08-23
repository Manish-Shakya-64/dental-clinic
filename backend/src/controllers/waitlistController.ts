import { Request, Response } from "express";
import * as waitlistService from "../services/waitlistService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError } from "../utils/apiError.js";
import { logAudit } from "../middleware/auditLogger.js";

export const joinWaitlist = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, treatmentId, preferredPractitionerId, preferredWindowStart, preferredWindowEnd } = req.body;

  const effectivePatientId = req.user!.role === "PATIENT" ? req.user!.patientId : patientId;
  if (!effectivePatientId) throw new ValidationError("patientId is required");

  const entry = await waitlistService.joinWaitlist({
    patientId: effectivePatientId,
    treatmentId,
    preferredPractitionerId,
    preferredWindowStart,
    preferredWindowEnd,
  });

  res.status(201).json({ data: entry });
});

export const listWaitlist = asyncHandler(async (_req: Request, res: Response) => {
  const entries = await waitlistService.listWaitlist();
  res.json({ data: entries });
});

export const offerSlot = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { slotId } = req.body;

  const appointment = await waitlistService.offerSlotToEntry(id, slotId);

  await logAudit({
    req,
    action: "WAITLIST_OFFER_BOOKED",
    resourceType: "Appointment",
    resourceId: appointment._id.toString(),
    status: "SUCCESS",
    metadata: { waitlistId: id },
  });
  res.status(201).json({ data: appointment });
});

export const removeEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await waitlistService.removeFromWaitlist(id);

  await logAudit({ req, action: "WAITLIST_REMOVED", resourceType: "Waitlist", resourceId: id, status: "SUCCESS" });
  res.status(204).send();
});
