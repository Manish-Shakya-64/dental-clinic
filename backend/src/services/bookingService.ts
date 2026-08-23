import crypto from "node:crypto";
import { Types } from "mongoose";
import { Appointment, IAppointment, IMedicine } from "../models/Appointment.js";
import { Patient } from "../models/Patient.js";
import { Practitioner } from "../models/Practitioner.js";
import { Room } from "../models/Room.js";
import { Treatment } from "../models/Treatment.js";
import { Slot } from "../models/Slot.js";
import { Waitlist, IWaitlist } from "../models/Waitlist.js";
import { generateCode } from "../utils/generateCode.js";
import { isDuplicateKeyError, duplicateKeyIsOn } from "../utils/mongoErrors.js";
import { ConflictError, NotFoundError, ValidationError } from "../utils/apiError.js";
import { env } from "../config/env.js";
import { sendBookingConfirmation, sendCancellationConfirmation, sendRescheduleConfirmation } from "./reminderService.js";

export interface CreateBookingInput {
  patientId: string;
  practitionerId: string;
  roomId: string;
  treatmentId: string;
  startTime: Date;
  slotId?: string;
}

export async function createBooking(input: CreateBookingInput): Promise<IAppointment> {
  const [patient, practitioner, room, treatment] = await Promise.all([
    Patient.findById(input.patientId),
    Practitioner.findById(input.practitionerId),
    Room.findById(input.roomId),
    Treatment.findById(input.treatmentId),
  ]);

  if (!patient) throw new NotFoundError("Patient not found");
  if (!practitioner || !practitioner.is_active) throw new NotFoundError("Practitioner not found or inactive");
  if (!room) throw new NotFoundError("Room not found");
  if (!treatment || !treatment.is_active) throw new NotFoundError("Treatment not found or inactive");

  let slot = null;
  if (input.slotId) {
    slot = await Slot.findById(input.slotId);
    if (!slot || slot.status !== "OPEN") {
      throw new ConflictError("Selected slot is no longer available");
    }
  }

  const endTime = new Date(input.startTime.getTime() + treatment.default_duration_mins * 60_000);

  let appointment: IAppointment | undefined;
  const MAX_CODE_COLLISION_RETRIES = 3;
  for (let attempt = 0; attempt <= MAX_CODE_COLLISION_RETRIES; attempt++) {
    try {
      appointment = await Appointment.create({
        appointment_code: generateCode("APT"),
        patient: input.patientId,
        practitioner: input.practitionerId,
        room: input.roomId,
        reason: input.treatmentId,
        slot: input.slotId ?? null,
        start_time: input.startTime,
        end_time: endTime,
        status: "DRAFT",
        lock_token: crypto.randomUUID(),
        lock_expires_at: new Date(Date.now() + env.SLOT_LOCK_TTL_MINUTES * 60_000),
      });
      break;
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
      if (duplicateKeyIsOn(err, "appointment_code") && attempt < MAX_CODE_COLLISION_RETRIES) continue;
      throw new ConflictError("This practitioner/room already has an appointment at that time");
    }
  }
  if (!appointment) throw new ConflictError("Unable to generate a unique appointment code, please retry");

  // Promote DRAFT -> CONFIRMED within the same request. A crash between the two writes leaves the
  // appointment in DRAFT, which lockExpiryJob later sweeps to LOCK_EXPIRED — DRAFT is a crash-safety
  // window, not a client-visible booking step.
  appointment.status = "CONFIRMED";
  appointment.lock_token = null;
  appointment.lock_expires_at = null;
  await appointment.save();

  if (slot) {
    slot.status = "BOOKED";
    await slot.save();
  }

  await sendBookingConfirmation({ appointment, patient, practitioner, room, treatment });

  return appointment;
}

export interface RescheduleInput {
  startTime: Date;
  practitionerId?: string;
  roomId?: string;
  slotId?: string;
}

export async function rescheduleAppointment(id: string, input: RescheduleInput): Promise<IAppointment> {
  const appointment = await Appointment.findById(id);
  if (!appointment) throw new NotFoundError("Appointment not found");
  assertNotTerminal(appointment);

  const treatment = await Treatment.findById(appointment.reason);
  if (!treatment) throw new NotFoundError("Treatment not found");

  let newSlot = null;
  if (input.slotId) {
    newSlot = await Slot.findById(input.slotId);
    if (!newSlot || newSlot.status !== "OPEN") {
      throw new ConflictError("Selected slot is no longer available");
    }
  }

  const previousSlotId = appointment.slot;
  const previousStartTime = appointment.start_time;

  appointment.start_time = input.startTime;
  appointment.end_time = new Date(input.startTime.getTime() + treatment.default_duration_mins * 60_000);
  if (input.practitionerId) appointment.practitioner = new Types.ObjectId(input.practitionerId);
  if (input.roomId) appointment.room = new Types.ObjectId(input.roomId);
  if (newSlot) appointment.slot = newSlot._id;
  appointment.status = "RECONFIRMED";

  try {
    await appointment.save();
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new ConflictError("This practitioner/room already has an appointment at that time");
    }
    throw err;
  }

  if (newSlot) {
    newSlot.status = "BOOKED";
    await newSlot.save();
  }
  if (previousSlotId && (!newSlot || !previousSlotId.equals(newSlot._id))) {
    await Slot.findByIdAndUpdate(previousSlotId, { status: "OPEN" });
  }

  const [patient, practitioner, room] = await Promise.all([
    Patient.findById(appointment.patient),
    Practitioner.findById(appointment.practitioner),
    Room.findById(appointment.room),
  ]);
  if (patient && practitioner && room) {
    await sendRescheduleConfirmation({ appointment, patient, practitioner, room, treatment, previousStartTime });
  }

  return appointment;
}

export interface CancelResult {
  appointment: IAppointment;
  waitlistMatches: IWaitlist[];
}

export async function cancelAppointment(id: string): Promise<CancelResult> {
  const appointment = await Appointment.findById(id);
  if (!appointment) throw new NotFoundError("Appointment not found");
  assertNotTerminal(appointment);

  appointment.status = "CANCELLED";
  await appointment.save();

  if (appointment.slot) {
    await Slot.findByIdAndUpdate(appointment.slot, { status: "OPEN" });
  }

  const [patient, practitioner, room, treatment] = await Promise.all([
    Patient.findById(appointment.patient),
    Practitioner.findById(appointment.practitioner),
    Room.findById(appointment.room),
    Treatment.findById(appointment.reason),
  ]);
  if (patient && practitioner && room && treatment) {
    await sendCancellationConfirmation({ appointment, patient, practitioner, room, treatment });
  }

  const candidates = await Waitlist.find({
    reason: appointment.reason,
    $or: [{ preferred_practitioner: null }, { preferred_practitioner: appointment.practitioner }],
  })
    .sort({ createdAt: 1 })
    .limit(10)
    .populate("patient")
    .populate("preferred_practitioner");

  const waitlistMatches = candidates.filter((entry) => {
    if (!entry.preferred_window_start || !entry.preferred_window_end) return true;
    return entry.preferred_window_start <= appointment.end_time && entry.preferred_window_end >= appointment.start_time;
  });

  return { appointment, waitlistMatches };
}

export async function checkIn(id: string, staffId: string): Promise<IAppointment> {
  const appointment = await Appointment.findById(id);
  if (!appointment) throw new NotFoundError("Appointment not found");
  assertNotTerminal(appointment);

  appointment.status = "WAITING";
  appointment.checked_in_by = new Types.ObjectId(staffId);
  await appointment.save();
  return appointment;
}

export async function markCompleted(id: string): Promise<IAppointment> {
  const appointment = await Appointment.findById(id);
  if (!appointment) throw new NotFoundError("Appointment not found");
  assertNotTerminal(appointment);

  appointment.status = "COMPLETED";
  await appointment.save();
  return appointment;
}

export async function markNoShow(id: string): Promise<IAppointment> {
  const appointment = await Appointment.findById(id);
  if (!appointment) throw new NotFoundError("Appointment not found");
  assertNotTerminal(appointment);

  appointment.status = "NO_SHOW";
  await appointment.save();
  return appointment;
}

export async function addClinicalNote(id: string, noteText: string): Promise<IAppointment> {
  const appointment = await Appointment.findById(id);
  if (!appointment) throw new NotFoundError("Appointment not found");

  appointment.clinical_note = { note_text: noteText, created_at: new Date() };
  await appointment.save();
  return appointment;
}

export async function addMedicine(id: string, medicine: IMedicine): Promise<IAppointment> {
  const appointment = await Appointment.findById(id);
  if (!appointment) throw new NotFoundError("Appointment not found");

  appointment.medicines.push(medicine);
  await appointment.save();
  return appointment;
}

const TERMINAL_STATUSES: IAppointment["status"][] = ["CANCELLED", "COMPLETED", "BILLED", "CHECKED_OUT", "RECALL_SCHEDULED", "NO_SHOW"];

function assertNotTerminal(appointment: IAppointment): void {
  if (TERMINAL_STATUSES.includes(appointment.status)) {
    throw new ValidationError(`Appointment is already ${appointment.status} and can no longer be modified`);
  }
}
