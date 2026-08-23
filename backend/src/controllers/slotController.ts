import { Request, Response } from "express";
import { FilterQuery } from "mongoose";
import { Slot, ISlot } from "../models/Slot.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/apiError.js";
import { logAudit } from "../middleware/auditLogger.js";

/** Not in the spec's endpoint summary table, but needed so patients/staff can browse availability
 *  before booking (§4.1) — open to any authenticated user, read-only. */
export const listSlots = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as { practitioner?: string; status?: string; from?: Date; to?: Date };

  const filter: FilterQuery<ISlot> = {};
  if (query.practitioner) filter.practitioner = query.practitioner;
  if (query.status) filter.status = query.status as ISlot["status"];
  if (query.from || query.to) {
    filter.start_time = {};
    if (query.from) filter.start_time.$gte = query.from;
    if (query.to) filter.start_time.$lte = query.to;
  }

  const slots = await Slot.find(filter).populate("practitioner").populate("room").sort({ start_time: 1 });
  res.json({ data: slots });
});

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const createSlot = asyncHandler(async (req: Request, res: Response) => {
  const { practitionerId, roomId, startTime, endTime, repeatWeeks } = req.body;
  const occurrences = repeatWeeks ?? 1;

  const slots = await Slot.create(
    Array.from({ length: occurrences }, (_, i) => ({
      practitioner: practitionerId,
      room: roomId,
      start_time: new Date(startTime.getTime() + i * WEEK_MS),
      end_time: new Date(endTime.getTime() + i * WEEK_MS),
      status: "OPEN" as const,
      created_by: req.user!.staffId,
    })),
  );

  await logAudit({
    req,
    action: "SLOT_CREATED",
    resourceType: "Slot",
    resourceId: slots[0]._id.toString(),
    status: "SUCCESS",
    metadata: { count: slots.length },
  });
  res.status(201).json({ data: occurrences > 1 ? slots : slots[0] });
});

export const updateSlot = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { startTime, endTime, status } = req.body;
  const slot = await Slot.findById(id);
  if (!slot) throw new NotFoundError("Slot not found");

  if (startTime !== undefined) slot.start_time = startTime;
  if (endTime !== undefined) slot.end_time = endTime;
  if (status !== undefined) slot.status = status;
  await slot.save();

  await logAudit({ req, action: "SLOT_UPDATED", resourceType: "Slot", resourceId: id, status: "SUCCESS" });
  res.json({ data: slot });
});

export const deleteSlot = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const slot = await Slot.findByIdAndDelete(id);
  if (!slot) throw new NotFoundError("Slot not found");

  await logAudit({ req, action: "SLOT_DELETED", resourceType: "Slot", resourceId: id, status: "SUCCESS" });
  res.status(204).send();
});
