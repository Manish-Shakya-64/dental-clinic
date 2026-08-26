import { Request, Response } from "express";
import * as waitlistService from "../services/waitlistService.js";
import * as waitlistOfferService from "../services/waitlistOfferService.js";
import { Slot } from "../models/Slot.js";
import { NotFoundError, ConflictError, ValidationError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
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

/** Reception's "Send offer": emails this one patient an accept link instead of booking outright.
 *  The instant-book path (offerSlot above) stays for when the patient is on the phone. */
export const sendOffer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { slotId } = req.body;

  const entry = await waitlistService.getEntry(id);
  const slot = await Slot.findById(slotId);
  if (!slot) throw new NotFoundError("Slot not found");
  if (slot.status !== "OPEN") throw new ConflictError("Selected slot is no longer available");

  const offers = await waitlistOfferService.offerToEntry(entry, slot);
  if (offers.length === 0) throw new ConflictError("Couldn't send that offer — the slot may no longer be available");

  await logAudit({
    req,
    action: "WAITLIST_OFFER_SENT",
    resourceType: "Waitlist",
    resourceId: id,
    status: "SUCCESS",
    metadata: { slotId },
  });
  res.status(201).json({ data: { sent: offers.length } });
});

/** Public: the patient clicking the link in their email isn't necessarily signed in, so these
 *  three are authenticated by the token itself, exactly like password reset. */
export const viewOffer = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await waitlistOfferService.getOfferByToken(req.params.token) });
});

export const acceptOffer = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await waitlistOfferService.acceptOffer(req.params.token);
  res.status(201).json({ data: appointment });
});

export const declineOffer = asyncHandler(async (req: Request, res: Response) => {
  await waitlistOfferService.declineOffer(req.params.token);
  res.json({ data: { message: "Offer declined. You're still on the waitlist." } });
});
