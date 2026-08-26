import { Types } from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { IPractitioner, WorkingHours } from "../models/Practitioner.js";
import { ConflictError, ValidationError } from "../utils/apiError.js";
import { formatFullName } from "../utils/personName.js";

/** Mongo weekday index (0 = Sunday) to the keys used in Practitioner.working_hours. */
const DAY_KEYS: (keyof WorkingHours)[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function parseHHMM(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function formatHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface BookingWindow {
  practitionerId: Types.ObjectId | string;
  roomId: Types.ObjectId | string;
  startTime: Date;
  endTime: Date;
  /** Set when rescheduling, so the appointment being moved doesn't clash with itself. */
  excludeAppointmentId?: Types.ObjectId | string;
}

/** Rejects times that have already passed. Reception books ahead for patients; a booking in the
 *  past is a typo, and it silently skips the reminder window too. */
export function assertNotInThePast(startTime: Date): void {
  if (startTime.getTime() < Date.now()) {
    throw new ValidationError("That date and time has already passed — pick a future time");
  }
}

/** Rejects appointments outside the dentist's configured working hours.
 *
 *  A practitioner with no hours configured is treated as unrestricted rather than unbookable —
 *  working_hours is optional on the model, and defaulting to "never available" would make every
 *  dentist unbookable until an admin filled the roster in. */
export function assertWithinWorkingHours(practitioner: IPractitioner, startTime: Date, endTime: Date): void {
  const hours = practitioner.working_hours;
  if (!hours || Object.keys(hours).length === 0) return;

  const dayKey = DAY_KEYS[startTime.getDay()];
  const blocks = hours[dayKey];
  const doctor = `Dr. ${formatFullName(practitioner)}`;

  if (!blocks || blocks.length === 0) {
    const weekday = startTime.toLocaleDateString("en-US", { weekday: "long" });
    throw new ValidationError(`${doctor} doesn't work on ${weekday}s — choose another day or dentist`);
  }

  const start = minutesOfDay(startTime);
  const end = minutesOfDay(endTime);
  const fits = blocks.some((b) => start >= parseHHMM(b.start) && end <= parseHHMM(b.end));

  if (!fits) {
    const available = blocks.map((b) => `${b.start}–${b.end}`).join(", ");
    throw new ValidationError(
      `${formatHHMM(start)}–${formatHHMM(end)} is outside ${doctor}'s hours that day (${available})`,
    );
  }
}

/** Rejects a booking that overlaps an existing one for the same dentist or the same room.
 *
 *  The unique index on (practitioner, room, start_time) only catches an *identical* start, so
 *  10:00–10:30 and 10:15–10:45 both used to be accepted for the same dentist. Slot-based booking
 *  was shielded from this because slots are pre-validated, but reception's free-time entry went
 *  straight through. Compared as half-open intervals, so back-to-back appointments are fine. */
export async function assertNoOverlap(window: BookingWindow): Promise<void> {
  const clash = await Appointment.findOne({
    is_blocking_slot: true,
    $or: [{ practitioner: window.practitionerId }, { room: window.roomId }],
    start_time: { $lt: window.endTime },
    end_time: { $gt: window.startTime },
    ...(window.excludeAppointmentId ? { _id: { $ne: window.excludeAppointmentId } } : {}),
  })
    .populate<{ practitioner: IPractitioner; room: { name: string } }>(["practitioner", "room"])
    .lean();

  if (!clash) return;

  const when = `${clash.start_time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  const clashesOnDentist = clash.practitioner._id.toString() === window.practitionerId.toString();

  throw new ConflictError(
    clashesOnDentist
      ? `Dr. ${formatFullName(clash.practitioner)} already has an appointment at ${when} that overlaps this time`
      : `${clash.room.name} is already in use at ${when}`,
  );
}
