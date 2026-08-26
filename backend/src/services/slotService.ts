import { Types } from "mongoose";
import { Slot } from "../models/Slot.js";
import { Practitioner, IPractitioner } from "../models/Practitioner.js";
import { Room, IRoom } from "../models/Room.js";
import { ConflictError, NotFoundError, ValidationError } from "../utils/apiError.js";
import { formatFullName } from "../utils/personName.js";

interface PopulatedSlot {
  _id: Types.ObjectId;
  practitioner: IPractitioner;
  room: IRoom;
  start_time: Date;
  end_time: Date;
}

/** A slot longer than this is almost always a mistyped date rather than a real clinic session.
 *  It also keeps "repeat weekly" occurrences (7 days apart) from ever overlapping each other. */
const MAX_SLOT_DURATION_MS = 24 * 60 * 60 * 1000;
const MIN_SLOT_DURATION_MS = 5 * 60 * 1000;

export interface SlotWindow {
  practitionerId: string;
  roomId: string;
  startTime: Date;
  endTime: Date;
}

function formatWindow(start: Date, end: Date): string {
  const date = start.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
  const from = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const to = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} ${from}–${to}`;
}

/** Rejects windows that can't describe a real session at all, independent of what else is booked. */
function assertWindowIsSane(start: Date, end: Date): void {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ValidationError("Start and end must both be valid dates");
  }
  if (start.getTime() <= Date.now()) {
    throw new ValidationError("That start time has already passed — slots can only be created for the future");
  }
  const duration = end.getTime() - start.getTime();
  if (duration <= 0) {
    throw new ValidationError("The slot's end time must be after its start time");
  }
  if (duration < MIN_SLOT_DURATION_MS) {
    throw new ValidationError("A slot must be at least 5 minutes long");
  }
  if (duration > MAX_SLOT_DURATION_MS) {
    throw new ValidationError("A slot can't be longer than 24 hours — check the start and end dates");
  }
}

/** Finds anything already occupying either the dentist or the room for an overlapping window.
 *  Slots are half-open intervals, so back-to-back slots (09:00–09:30, 09:30–10:00) don't collide.
 *  BLOCKED and BOOKED slots count as occupied just as much as OPEN ones — all three mean the
 *  dentist or room is spoken for. */
async function findConflict(window: SlotWindow, excludeSlotId?: string): Promise<PopulatedSlot | null> {
  const filter: Record<string, unknown> = {
    $or: [{ practitioner: window.practitionerId }, { room: window.roomId }],
    start_time: { $lt: window.endTime },
    end_time: { $gt: window.startTime },
  };
  if (excludeSlotId) {
    filter._id = { $ne: new Types.ObjectId(excludeSlotId) };
  }
  return Slot.findOne(filter)
    .populate<{ practitioner: IPractitioner; room: IRoom }>(["practitioner", "room"])
    .lean<PopulatedSlot | null>();
}

/** Validates one prospective slot window against the schedule, throwing with a message that names
 *  the actual clash so the admin can go fix it rather than guessing. */
export async function assertSlotWindowIsFree(window: SlotWindow, excludeSlotId?: string): Promise<void> {
  assertWindowIsSane(window.startTime, window.endTime);

  const conflict = await findConflict(window, excludeSlotId);
  if (!conflict) return;

  const clashesOnPractitioner = conflict.practitioner._id.toString() === window.practitionerId;
  const existing = formatWindow(conflict.start_time, conflict.end_time);

  if (clashesOnPractitioner) {
    throw new ConflictError(
      `Dr. ${formatFullName(conflict.practitioner)} already has a slot at ${existing}. ` +
        `A dentist can't be double-booked, even in a different room.`,
    );
  }

  throw new ConflictError(
    `${conflict.room.name} is already taken at ${existing}. A room can't host two dentists at the same time.`,
  );
}

/** Confirms the dentist and room actually exist (and that the dentist is still active) before we
 *  write a slot pointing at them — a syntactically valid ObjectId is not proof of an existing row. */
export async function assertReferencesExist(practitionerId: string, roomId: string): Promise<void> {
  const [practitioner, room] = await Promise.all([Practitioner.findById(practitionerId), Room.findById(roomId)]);

  if (!practitioner) throw new NotFoundError("That dentist no longer exists");
  if (!practitioner.is_active) throw new ValidationError("That dentist's account is deactivated — reactivate it before scheduling slots");
  if (!room) throw new NotFoundError("That room no longer exists");
}

/** Validates an entire "repeat weekly" batch up front so a partially-created series can never be
 *  left behind — either every occurrence is free, or nothing is written at all. Occurrences are
 *  also checked against each other, not just against what's already stored. */
export async function assertBatchIsFree(windows: SlotWindow[]): Promise<void> {
  for (const window of windows) {
    await assertSlotWindowIsFree(window);
  }

  for (let i = 0; i < windows.length; i++) {
    for (let j = i + 1; j < windows.length; j++) {
      const a = windows[i];
      const b = windows[j];
      const samePractitioner = a.practitionerId === b.practitionerId;
      const sameRoom = a.roomId === b.roomId;
      const overlaps = a.startTime < b.endTime && a.endTime > b.startTime;
      if ((samePractitioner || sameRoom) && overlaps) {
        throw new ConflictError("The repeating slots would overlap each other — shorten the slot or reduce the repeat count");
      }
    }
  }
}
