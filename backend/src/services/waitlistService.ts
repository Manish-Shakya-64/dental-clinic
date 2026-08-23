import { Waitlist, IWaitlist } from "../models/Waitlist.js";
import { Slot } from "../models/Slot.js";
import { IAppointment } from "../models/Appointment.js";
import { NotFoundError, ConflictError } from "../utils/apiError.js";
import * as bookingService from "./bookingService.js";

export interface JoinWaitlistInput {
  patientId: string;
  treatmentId: string;
  preferredPractitionerId?: string;
  preferredWindowStart?: Date;
  preferredWindowEnd?: Date;
}

export async function joinWaitlist(input: JoinWaitlistInput): Promise<IWaitlist> {
  return Waitlist.create({
    patient: input.patientId,
    reason: input.treatmentId,
    preferred_practitioner: input.preferredPractitionerId ?? null,
    preferred_window_start: input.preferredWindowStart,
    preferred_window_end: input.preferredWindowEnd,
  });
}

export async function listWaitlist(): Promise<IWaitlist[]> {
  return Waitlist.find()
    .sort({ createdAt: 1 })
    .populate("patient")
    .populate("reason")
    .populate("preferred_practitioner");
}

/** Books the reopened slot directly for the waitlist patient (no separate offer/confirm step —
 *  reception makes the call before offering, matching the "Offer this slot" button), then removes
 *  the now-fulfilled entry. */
export async function offerSlotToEntry(waitlistId: string, slotId: string): Promise<IAppointment> {
  const entry = await Waitlist.findById(waitlistId);
  if (!entry) throw new NotFoundError("Waitlist entry not found");

  const slot = await Slot.findById(slotId);
  if (!slot) throw new NotFoundError("Slot not found");
  if (slot.status !== "OPEN") throw new ConflictError("Selected slot is no longer available");

  const appointment = await bookingService.createBooking({
    patientId: entry.patient.toString(),
    practitionerId: slot.practitioner.toString(),
    roomId: slot.room.toString(),
    treatmentId: entry.reason.toString(),
    startTime: slot.start_time,
    slotId: slot._id.toString(),
  });

  await Waitlist.findByIdAndDelete(waitlistId);
  return appointment;
}

export async function removeFromWaitlist(waitlistId: string): Promise<void> {
  const entry = await Waitlist.findByIdAndDelete(waitlistId);
  if (!entry) throw new NotFoundError("Waitlist entry not found");
}
