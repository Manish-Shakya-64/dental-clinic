import crypto from "node:crypto";
import { Types } from "mongoose";
import { WaitlistOffer, IWaitlistOffer } from "../models/WaitlistOffer.js";
import { Waitlist, IWaitlist } from "../models/Waitlist.js";
import { Slot, ISlot } from "../models/Slot.js";
import { Patient } from "../models/Patient.js";
import { Practitioner, IPractitioner } from "../models/Practitioner.js";
import { Room, IRoom } from "../models/Room.js";
import { Treatment, ITreatment } from "../models/Treatment.js";
import { IAppointment } from "../models/Appointment.js";
import * as bookingService from "./bookingService.js";
import { sendEmail } from "./emailService.js";
import { buildSimpleEmailHtml } from "./emailTemplates.js";
import { formatFullName } from "../utils/personName.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { ConflictError, NotFoundError } from "../utils/apiError.js";

const SLOT_GONE = "Sorry — that appointment has just been taken. You're still on the waitlist.";

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** An offer must never outlive the appointment it is for — a slot at 9am tomorrow can't be
 *  claimable at 10am tomorrow, however much of the TTL is left. */
function offerExpiry(slotStart: Date): Date {
  const ttl = new Date(Date.now() + env.WAITLIST_OFFER_TTL_HOURS * 60 * 60_000);
  return ttl < slotStart ? ttl : slotStart;
}

export interface FreedSlotContext {
  slotId: Types.ObjectId | string;
  treatmentId: Types.ObjectId | string;
  practitionerId: Types.ObjectId | string;
  startTime: Date;
  endTime: Date;
}

/** Longest-waiting entries that want this treatment, aren't tied to a different dentist, and whose
 *  preferred window (if they gave one) overlaps the freed time. */
async function findMatches(ctx: FreedSlotContext, limit: number) {
  const candidates = await Waitlist.find({
    reason: ctx.treatmentId,
    $or: [{ preferred_practitioner: null }, { preferred_practitioner: ctx.practitionerId }],
  }).sort({ createdAt: 1 });

  return candidates
    .filter((entry) => {
      if (!entry.preferred_window_start || !entry.preferred_window_end) return true;
      return entry.preferred_window_start <= ctx.endTime && entry.preferred_window_end >= ctx.startTime;
    })
    .slice(0, limit);
}

/** Emails the longest-waiting matches an accept link for a slot that just came free.
 *
 *  The slot is deliberately left OPEN rather than held for the offer: holding it would risk
 *  stranding the slot if nobody replies, and stranded-forever slots are exactly the bug class this
 *  system already had twice. The trade-off is that a walk-in booking can beat an offer, which
 *  `acceptOffer` handles by reporting the slot as gone. */
export async function offerFreedSlot(ctx: FreedSlotContext): Promise<IWaitlistOffer[]> {
  const slot = await Slot.findById(ctx.slotId);
  if (!slot || slot.status !== "OPEN") return [];
  if (slot.start_time <= new Date()) return [];

  const matches = await findMatches(ctx, env.WAITLIST_OFFER_MAX_RECIPIENTS);
  if (matches.length === 0) return [];

  const [practitioner, room, treatment] = await Promise.all([
    Practitioner.findById(ctx.practitionerId),
    Room.findById(slot.room),
    Treatment.findById(ctx.treatmentId),
  ]);
  if (!practitioner || !room || !treatment) return [];

  const expiresAt = offerExpiry(slot.start_time);
  const created: IWaitlistOffer[] = [];

  for (const entry of matches) {
    const offer = await createAndSendOffer(entry, slot, treatment, practitioner, room, expiresAt);
    if (offer) created.push(offer);
  }

  logger.info({ slotId: slot._id.toString(), offers: created.length }, "[waitlistOffer] offers sent");
  return created;
}

/** Creates one offer and emails its accept link. Returns null if the recipient can't be resolved
 *  or the record couldn't be written — one bad entry must not stop the rest of the batch. */
async function createAndSendOffer(
  entry: IWaitlist,
  slot: ISlot,
  treatment: ITreatment,
  practitioner: IPractitioner,
  room: IRoom,
  expiresAt: Date,
): Promise<IWaitlistOffer | null> {
  try {
      const patient = await Patient.findById(entry.patient);
      if (!patient) return null;

      const rawToken = crypto.randomBytes(32).toString("hex");
      const offer = await WaitlistOffer.create({
        waitlist: entry._id,
        patient: patient._id,
        slot: slot._id,
        treatment: treatment._id,
        token_hash: hashToken(rawToken),
        expires_at: expiresAt,
        status: "PENDING",
      });

      const acceptUrl = `${env.FRONTEND_URL}/waitlist-offer?token=${rawToken}`;
      const when = slot.start_time.toLocaleString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
      });

      // Email failure must not stop the remaining offers going out, so it's caught per recipient.
      try {
        await sendEmail({
          to: patient.email,
          subject: `An earlier appointment is available — ${when}`,
          text:
            `Hi ${formatFullName(patient)},\n\n` +
            `A slot has opened up for your ${treatment.label}:\n\n` +
            `${when}\nDentist: Dr. ${formatFullName(practitioner)}\nRoom: ${room.name}\n\n` +
            `Claim it here: ${acceptUrl}\n\n` +
            `This is offered to a few waiting patients at once, so it's first come, first served. ` +
            `The link expires ${expiresAt.toLocaleString("en-US")}.\n\n— Bright Smile Dental`,
          html: buildSimpleEmailHtml({
            headline: "An earlier appointment is available",
            bodyHtml:
              `<p style="margin:0 0 16px;">Hi ${formatFullName(patient)}, a slot has opened up for your <strong>${treatment.label}</strong>.</p>` +
              `<div style="background:#f5f9fc;border-radius:12px;padding:16px 20px;font-size:14px;color:#243b53;">` +
              `<div style="font-weight:700;font-size:15px;">${when}</div>` +
              `<div style="margin-top:6px;color:#4a6178;">Dr. ${formatFullName(practitioner)} · ${room.name}</div>` +
              `</div>` +
              `<p style="margin:18px 0 0;">We offer these to a few waiting patients at once, so it's first come, first served.</p>`,
            buttonLabel: "Claim this appointment",
            buttonUrl: acceptUrl,
            footerHtml: `<p style="margin:20px 0 0;">This link expires ${expiresAt.toLocaleString("en-US")}. If you'd rather keep waiting for a different time, just ignore this email — you'll stay on the list.</p>`,
          }),
        });
      } catch (err) {
        logger.error({ err, offerId: offer._id.toString() }, "[waitlistOffer] failed to email offer");
      }

      return offer;
  } catch (err) {
    logger.error({ err, waitlistId: entry._id.toString() }, "[waitlistOffer] failed to create offer");
    return null;
  }
}

/** Reception's manual "Send offer" — same email and accept flow, aimed at one chosen patient
 *  rather than the automatic top-N batch. */
export async function offerToEntry(entry: IWaitlist, slot: ISlot): Promise<IWaitlistOffer[]> {
  // Same guards the automatic path applies: emailing an accept link for a slot that has already
  // started only leads the patient to a booking error.
  if (slot.status !== "OPEN") throw new ConflictError("That slot is no longer available");
  if (slot.start_time <= new Date()) throw new ConflictError("That appointment time has already passed");

  const [practitioner, room, treatment] = await Promise.all([
    Practitioner.findById(slot.practitioner),
    Room.findById(slot.room),
    Treatment.findById(entry.reason),
  ]);
  if (!practitioner || !room || !treatment) return [];

  const offer = await createAndSendOffer(entry, slot, treatment, practitioner, room, offerExpiry(slot.start_time));
  return offer ? [offer] : [];
}

async function loadPendingOffer(rawToken: string): Promise<IWaitlistOffer> {
  const offer = await WaitlistOffer.findOne({ token_hash: hashToken(rawToken) });
  if (!offer) throw new NotFoundError("This offer link isn't valid");
  return offer;
}

export interface OfferView {
  status: IWaitlistOffer["status"];
  expiresAt: Date;
  treatmentLabel: string;
  doctorName: string;
  roomName: string;
  startTime: Date;
  patientName: string;
  /** False once the slot has gone, even if the offer itself hasn't been swept yet. */
  claimable: boolean;
}

/** Read-only view for the accept page, so the patient sees what they're claiming before clicking. */
export async function getOfferByToken(rawToken: string): Promise<OfferView> {
  const offer = await loadPendingOffer(rawToken);
  const [slot, treatment, patient] = await Promise.all([
    Slot.findById(offer.slot),
    Treatment.findById(offer.treatment),
    Patient.findById(offer.patient),
  ]);
  if (!slot || !treatment || !patient) throw new NotFoundError("This offer is no longer available");

  const [practitioner, room] = await Promise.all([Practitioner.findById(slot.practitioner), Room.findById(slot.room)]);

  const expired = offer.expires_at <= new Date();
  return {
    status: offer.status,
    expiresAt: offer.expires_at,
    treatmentLabel: treatment.label,
    doctorName: practitioner ? `Dr. ${formatFullName(practitioner)}` : "—",
    roomName: room?.name ?? "—",
    startTime: slot.start_time,
    patientName: formatFullName(patient),
    claimable: offer.status === "PENDING" && !expired && slot.status === "OPEN",
  };
}

/** Claims the slot for the offered patient. Whoever gets here first wins: the booking itself is
 *  guarded by the appointment uniqueness index, so a simultaneous accept loses cleanly rather than
 *  double-booking. */
export async function acceptOffer(rawToken: string): Promise<IAppointment> {
  const offer = await loadPendingOffer(rawToken);

  // Each closed state gets its own message: "no longer available" leaves the patient guessing
  // whether they lost the race, already accepted, or waited too long — and whether they're still
  // on the list.
  if (offer.status === "ACCEPTED") throw new ConflictError("You've already claimed this appointment");
  if (offer.status === "SUPERSEDED") throw new ConflictError(SLOT_GONE);
  if (offer.status === "EXPIRED") throw new ConflictError("This offer has expired. You're still on the waitlist.");
  if (offer.status === "DECLINED") throw new ConflictError("You turned this one down. You're still on the waitlist for other times.");
  if (offer.status !== "PENDING") throw new ConflictError("This offer is no longer available");
  if (offer.expires_at <= new Date()) {
    offer.status = "EXPIRED";
    await offer.save();
    throw new ConflictError("This offer has expired. You're still on the waitlist.");
  }

  const slot = await Slot.findById(offer.slot);
  if (!slot) throw new NotFoundError("That appointment time no longer exists");
  if (slot.status !== "OPEN") {
    offer.status = "SUPERSEDED";
    offer.responded_at = new Date();
    await offer.save();
    throw new ConflictError(SLOT_GONE);
  }

  let appointment: IAppointment;
  try {
    appointment = await bookingService.createBooking({
      patientId: offer.patient.toString(),
      practitionerId: slot.practitioner.toString(),
      roomId: slot.room.toString(),
      treatmentId: offer.treatment.toString(),
      startTime: slot.start_time,
      slotId: slot._id.toString(),
    });
  } catch (err) {
    if (err instanceof ConflictError) {
      offer.status = "SUPERSEDED";
      offer.responded_at = new Date();
      await offer.save();
      throw new ConflictError(SLOT_GONE);
    }
    throw err;
  }

  offer.status = "ACCEPTED";
  offer.appointment = appointment._id;
  offer.responded_at = new Date();
  await offer.save();

  // The patient's need is met, so they come off the list, and the competing offers for this slot
  // are closed so nobody else is left holding a link that will only disappoint them.
  await Waitlist.findByIdAndDelete(offer.waitlist);
  await WaitlistOffer.updateMany(
    { slot: offer.slot, status: "PENDING", _id: { $ne: offer._id } },
    { $set: { status: "SUPERSEDED", responded_at: new Date() } },
  );

  logger.info({ offerId: offer._id.toString(), appointmentId: appointment._id.toString() }, "[waitlistOffer] accepted");
  return appointment;
}

/** "No thanks" — closes this offer without removing the patient from the waitlist. */
export async function declineOffer(rawToken: string): Promise<void> {
  const offer = await loadPendingOffer(rawToken);
  if (offer.status !== "PENDING") return;
  offer.status = "DECLINED";
  offer.responded_at = new Date();
  await offer.save();
}
