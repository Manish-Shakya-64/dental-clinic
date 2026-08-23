import { Request, Response } from "express";
import { FilterQuery } from "mongoose";
import { Slot, ISlot } from "../models/Slot.js";
import * as slotService from "../services/slotService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ConflictError, NotFoundError } from "../utils/apiError.js";
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

  const windows = Array.from({ length: occurrences }, (_, i) => ({
    practitionerId,
    roomId,
    startTime: new Date(startTime.getTime() + i * WEEK_MS),
    endTime: new Date(endTime.getTime() + i * WEEK_MS),
  }));

  // Validate the whole series before writing any of it, so a clash on week 3 can't leave weeks 1–2
  // behind as a half-created schedule the admin then has to clean up by hand.
  await slotService.assertReferencesExist(practitionerId, roomId);
  await slotService.assertBatchIsFree(windows);

  const slots = await Slot.create(
    windows.map((w) => ({
      practitioner: w.practitionerId,
      room: w.roomId,
      start_time: w.startTime,
      end_time: w.endTime,
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

  // The admin UI already disables these controls for a booked slot, but the API is reachable
  // directly — without this guard a booked slot could be moved or freed out from under the
  // appointment still pointing at it.
  if (slot.status === "BOOKED") {
    throw new ConflictError("This slot is booked by a patient — cancel the appointment before changing it");
  }

  const nextStart = startTime ?? slot.start_time;
  const nextEnd = endTime ?? slot.end_time;
  if (startTime !== undefined || endTime !== undefined) {
    await slotService.assertSlotWindowIsFree(
      {
        practitionerId: slot.practitioner.toString(),
        roomId: slot.room.toString(),
        startTime: nextStart,
        endTime: nextEnd,
      },
      id,
    );
  }

  if (startTime !== undefined) slot.start_time = startTime;
  if (endTime !== undefined) slot.end_time = endTime;
  if (status !== undefined) slot.status = status;
  await slot.save();

  await logAudit({ req, action: "SLOT_UPDATED", resourceType: "Slot", resourceId: id, status: "SUCCESS" });
  res.json({ data: slot });
});

export const deleteSlot = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const slot = await Slot.findById(id);
  if (!slot) throw new NotFoundError("Slot not found");

  if (slot.status === "BOOKED") {
    throw new ConflictError("This slot is booked by a patient — cancel the appointment before deleting it");
  }

  await slot.deleteOne();
  await logAudit({ req, action: "SLOT_DELETED", resourceType: "Slot", resourceId: id, status: "SUCCESS" });
  res.status(204).send();
});
