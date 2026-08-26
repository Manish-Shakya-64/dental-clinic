import crypto from "node:crypto";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "@jest/globals";
import { Practitioner } from "../src/models/Practitioner.js";
import { Room } from "../src/models/Room.js";
import { Treatment } from "../src/models/Treatment.js";
import { Patient } from "../src/models/Patient.js";
import { StaffMember } from "../src/models/StaffMember.js";
import { Slot } from "../src/models/Slot.js";
import { Waitlist } from "../src/models/Waitlist.js";
import { WaitlistOffer } from "../src/models/WaitlistOffer.js";
import { Appointment } from "../src/models/Appointment.js";
import * as waitlistOfferService from "../src/services/waitlistOfferService.js";
import * as bookingService from "../src/services/bookingService.js";
import { runWaitlistOfferExpiryJob } from "../src/jobs/waitlistOfferExpiryJob.js";
import { env } from "../src/config/env.js";
import { connectTestDb, clearTestDb, disconnectTestDb } from "./helpers/db.js";

beforeAll(async () => {
  await connectTestDb();
});
beforeEach(async () => {
  await clearTestDb();
});
afterAll(async () => {
  await disconnectTestDb();
});

async function fixtures() {
  const [practitioner, other, room, treatment, staff] = await Promise.all([
    Practitioner.create({ first_name: "Ada", last_name: "Alpha", gender: "FEMALE", specialties: ["General"] }),
    Practitioner.create({ first_name: "Bo", last_name: "Beta", gender: "MALE", specialties: ["General"] }),
    Room.create({ name: "Room 1" }),
    Treatment.create({ label: "Check-up", default_duration_mins: 30, price: 100 }),
    StaffMember.create({ first_name: "Ava", last_name: "Admin", gender: "FEMALE", email: "ava@clinic.test", role: "ADMIN" }),
  ]);
  return { practitioner, other, room, treatment, staff };
}

type Ctx = Awaited<ReturnType<typeof fixtures>>;

let n = 0;
async function makePatient() {
  n++;
  return Patient.create({
    first_name: `Pat${n}`, last_name: "Waiting", gender: "OTHER",
    email: `wait${n}@example.test`, phone: `040000${String(n).padStart(4, "0")}`, dob: "1990-01-01",
  });
}

async function makeSlot(ctx: Ctx, startsInHours: number) {
  const start = new Date(Date.now() + startsInHours * 3600_000);
  return Slot.create({
    practitioner: ctx.practitioner._id, room: ctx.room._id,
    start_time: start, end_time: new Date(start.getTime() + 30 * 60_000),
    status: "OPEN", created_by: ctx.staff._id,
  });
}

function freedContext(ctx: Ctx, slot: Awaited<ReturnType<typeof makeSlot>>) {
  return {
    slotId: slot._id,
    treatmentId: ctx.treatment._id,
    practitionerId: ctx.practitioner._id,
    startTime: slot.start_time,
    endTime: slot.end_time,
  };
}

/** Only the emailed link ever carries the raw token — the database stores just its hash. Tests that
 *  need to accept an offer therefore mint a fresh token and rewrite the stored hash to match, which
 *  exercises the real lookup path without needing to intercept the email. */
async function tokenFor(offerId: string): Promise<string> {
  const raw = crypto.randomBytes(32).toString("hex");
  await WaitlistOffer.findByIdAndUpdate(offerId, {
    token_hash: crypto.createHash("sha256").update(raw).digest("hex"),
  });
  return raw;
}

describe("waitlist offers: automatic fan-out when a slot frees", () => {
  it(`emails at most the configured number of longest-waiting matches`, async () => {
    const ctx = await fixtures();
    for (let i = 0; i < env.WAITLIST_OFFER_MAX_RECIPIENTS + 2; i++) {
      await Waitlist.create({ patient: (await makePatient())._id, reason: ctx.treatment._id });
    }
    const slot = await makeSlot(ctx, 72);

    const offers = await waitlistOfferService.offerFreedSlot(freedContext(ctx, slot));

    expect(offers).toHaveLength(env.WAITLIST_OFFER_MAX_RECIPIENTS);
    expect(await WaitlistOffer.countDocuments({ status: "PENDING" })).toBe(env.WAITLIST_OFFER_MAX_RECIPIENTS);
  });

  it("offers to the longest-waiting entries first", async () => {
    const ctx = await fixtures();
    const first = await makePatient();
    const second = await makePatient();
    const third = await makePatient();
    // createdAt ordering is what decides priority.
    await Waitlist.create({ patient: first._id, reason: ctx.treatment._id, createdAt: new Date(Date.now() - 5 * 86400_000) });
    await Waitlist.create({ patient: second._id, reason: ctx.treatment._id, createdAt: new Date(Date.now() - 2 * 86400_000) });
    await Waitlist.create({ patient: third._id, reason: ctx.treatment._id, createdAt: new Date() });
    const slot = await makeSlot(ctx, 72);

    await waitlistOfferService.offerFreedSlot({ ...freedContext(ctx, slot) });

    const offered = await WaitlistOffer.find().sort({ createdAt: 1 });
    expect(offered.map((o) => o.patient.toString())).toContain(first._id.toString());
  });

  it("skips entries that want a different dentist", async () => {
    const ctx = await fixtures();
    const wrongDoctor = await makePatient();
    await Waitlist.create({ patient: wrongDoctor._id, reason: ctx.treatment._id, preferred_practitioner: ctx.other._id });
    const slot = await makeSlot(ctx, 72);

    const offers = await waitlistOfferService.offerFreedSlot(freedContext(ctx, slot));

    expect(offers).toHaveLength(0);
  });

  it("skips entries whose preferred window doesn't cover the freed time", async () => {
    const ctx = await fixtures();
    const patient = await makePatient();
    await Waitlist.create({
      patient: patient._id, reason: ctx.treatment._id,
      preferred_window_start: new Date(Date.now() + 20 * 86400_000),
      preferred_window_end: new Date(Date.now() + 30 * 86400_000),
    });
    const slot = await makeSlot(ctx, 72);

    expect(await waitlistOfferService.offerFreedSlot(freedContext(ctx, slot))).toHaveLength(0);
  });

  it("does not offer a slot that has already been taken", async () => {
    const ctx = await fixtures();
    await Waitlist.create({ patient: (await makePatient())._id, reason: ctx.treatment._id });
    const slot = await makeSlot(ctx, 72);
    slot.status = "BOOKED";
    await slot.save();

    expect(await waitlistOfferService.offerFreedSlot(freedContext(ctx, slot))).toHaveLength(0);
  });

  it("does not offer a slot in the past", async () => {
    const ctx = await fixtures();
    await Waitlist.create({ patient: (await makePatient())._id, reason: ctx.treatment._id });
    const slot = await makeSlot(ctx, -2);

    expect(await waitlistOfferService.offerFreedSlot(freedContext(ctx, slot))).toHaveLength(0);
  });

  it("caps expiry at the slot's start time so an offer can't outlive the appointment", async () => {
    const ctx = await fixtures();
    await Waitlist.create({ patient: (await makePatient())._id, reason: ctx.treatment._id });
    // Slot sooner than the TTL, so the TTL must be trimmed back to the start time.
    const slot = await makeSlot(ctx, Math.max(1, env.WAITLIST_OFFER_TTL_HOURS - 2));

    const [offer] = await waitlistOfferService.offerFreedSlot(freedContext(ctx, slot));

    expect(offer.expires_at.getTime()).toBe(slot.start_time.getTime());
  });
});

describe("waitlist offers: reception's manual send", () => {
  it("refuses to email an offer for a slot that has already passed", async () => {
    const ctx = await fixtures();
    const entry = await Waitlist.create({ patient: (await makePatient())._id, reason: ctx.treatment._id });
    const slot = await makeSlot(ctx, -2);

    // This is what reception hit: the picker listed stale slots, so the offer produced a booking
    // error and no email instead of a confirmation.
    await expect(waitlistOfferService.offerToEntry(entry, slot)).rejects.toThrow(/already passed/i);
    expect(await WaitlistOffer.countDocuments()).toBe(0);
  });

  it("refuses to email an offer for a slot that is no longer open", async () => {
    const ctx = await fixtures();
    const entry = await Waitlist.create({ patient: (await makePatient())._id, reason: ctx.treatment._id });
    const slot = await makeSlot(ctx, 72);
    slot.status = "BOOKED";
    await slot.save();

    await expect(waitlistOfferService.offerToEntry(entry, slot)).rejects.toThrow(/no longer available/i);
  });

  it("emails an offer for a valid upcoming slot", async () => {
    const ctx = await fixtures();
    const entry = await Waitlist.create({ patient: (await makePatient())._id, reason: ctx.treatment._id });
    const slot = await makeSlot(ctx, 72);

    const offers = await waitlistOfferService.offerToEntry(entry, slot);

    expect(offers).toHaveLength(1);
    expect(offers[0].status).toBe("PENDING");
  });
});

describe("waitlist offers: accepting", () => {
  async function offerOne(ctx: Ctx) {
    const patient = await makePatient();
    const entry = await Waitlist.create({ patient: patient._id, reason: ctx.treatment._id });
    const slot = await makeSlot(ctx, 72);
    const [offer] = await waitlistOfferService.offerFreedSlot(freedContext(ctx, slot));
    return { patient, entry, slot, offer, token: await tokenFor(offer._id.toString()) };
  }

  it("books the appointment and takes the patient off the waitlist", async () => {
    const ctx = await fixtures();
    const { patient, entry, slot, token } = await offerOne(ctx);

    const appointment = await waitlistOfferService.acceptOffer(token);

    expect(appointment.patient.toString()).toBe(patient._id.toString());
    expect(appointment.start_time.getTime()).toBe(slot.start_time.getTime());
    expect(await Waitlist.findById(entry._id)).toBeNull();
    expect((await Slot.findById(slot._id))!.status).toBe("BOOKED");
  });

  it("closes the competing offers for the same slot", async () => {
    const ctx = await fixtures();
    await Waitlist.create({ patient: (await makePatient())._id, reason: ctx.treatment._id });
    await Waitlist.create({ patient: (await makePatient())._id, reason: ctx.treatment._id });
    const slot = await makeSlot(ctx, 72);
    const offers = await waitlistOfferService.offerFreedSlot(freedContext(ctx, slot));
    expect(offers.length).toBeGreaterThan(1);

    await waitlistOfferService.acceptOffer(await tokenFor(offers[0]._id.toString()));

    const others = await WaitlistOffer.find({ _id: { $ne: offers[0]._id } });
    expect(others.every((o) => o.status === "SUPERSEDED")).toBe(true);
  });

  it("tells the loser the slot has gone, and leaves them on the waitlist", async () => {
    const ctx = await fixtures();
    const loser = await makePatient();
    const loserEntry = await Waitlist.create({ patient: loser._id, reason: ctx.treatment._id });
    await Waitlist.create({ patient: (await makePatient())._id, reason: ctx.treatment._id });
    const slot = await makeSlot(ctx, 72);
    const offers = await waitlistOfferService.offerFreedSlot(freedContext(ctx, slot));

    const loserOffer = offers.find((o) => o.patient.toString() === loser._id.toString())!;
    const winnerOffer = offers.find((o) => o.patient.toString() !== loser._id.toString())!;
    const loserToken = await tokenFor(loserOffer._id.toString());

    await waitlistOfferService.acceptOffer(await tokenFor(winnerOffer._id.toString()));

    await expect(waitlistOfferService.acceptOffer(loserToken)).rejects.toThrow(/just been taken/i);
    expect(await Waitlist.findById(loserEntry._id)).not.toBeNull();
  });

  it("refuses an expired offer", async () => {
    const ctx = await fixtures();
    const { offer, token } = await offerOne(ctx);
    await WaitlistOffer.findByIdAndUpdate(offer._id, { expires_at: new Date(Date.now() - 60_000) });

    await expect(waitlistOfferService.acceptOffer(token)).rejects.toThrow(/expired/i);
    expect((await WaitlistOffer.findById(offer._id))!.status).toBe("EXPIRED");
  });

  it("refuses an unknown token", async () => {
    await fixtures();
    await expect(waitlistOfferService.acceptOffer("not-a-real-token")).rejects.toThrow(/isn't valid/i);
  });

  it("refuses to accept twice", async () => {
    const ctx = await fixtures();
    const { token } = await offerOne(ctx);
    await waitlistOfferService.acceptOffer(token);

    await expect(waitlistOfferService.acceptOffer(token)).rejects.toThrow(/already claimed/i);
    expect(await Appointment.countDocuments()).toBe(1);
  });

  it("declining keeps the patient on the waitlist", async () => {
    const ctx = await fixtures();
    const { entry, offer, token } = await offerOne(ctx);

    await waitlistOfferService.declineOffer(token);

    expect((await WaitlistOffer.findById(offer._id))!.status).toBe("DECLINED");
    expect(await Waitlist.findById(entry._id)).not.toBeNull();
    expect(await Appointment.countDocuments()).toBe(0);
  });

  it("exposes a read-only view for the accept page", async () => {
    const ctx = await fixtures();
    const { token } = await offerOne(ctx);

    const view = await waitlistOfferService.getOfferByToken(token);

    expect(view.claimable).toBe(true);
    expect(view.treatmentLabel).toBe("Check-up");
    expect(view.doctorName).toBe("Dr. Ada Alpha");
  });
});

describe("waitlist offers: triggered by real cancellations", () => {
  it("offers the freed slot when an appointment is cancelled", async () => {
    const ctx = await fixtures();
    const booker = await makePatient();
    const waiter = await makePatient();
    await Waitlist.create({ patient: waiter._id, reason: ctx.treatment._id });

    const slot = await makeSlot(ctx, 72);
    const appointment = await bookingService.createBooking({
      patientId: booker._id.toString(),
      practitionerId: ctx.practitioner._id.toString(),
      roomId: ctx.room._id.toString(),
      treatmentId: ctx.treatment._id.toString(),
      startTime: slot.start_time,
      slotId: slot._id.toString(),
    });

    await bookingService.cancelAppointment(appointment._id.toString());
    // The offer fan-out is intentionally fire-and-forget, so give it a tick to land.
    await new Promise((r) => setTimeout(r, 250));

    const offers = await WaitlistOffer.find({ slot: slot._id });
    expect(offers).toHaveLength(1);
    expect(offers[0].patient.toString()).toBe(waiter._id.toString());
  });
});

describe("waitlist offers: expiry sweep", () => {
  it("marks lapsed offers EXPIRED and leaves live ones alone", async () => {
    const ctx = await fixtures();
    await Waitlist.create({ patient: (await makePatient())._id, reason: ctx.treatment._id });
    const slot = await makeSlot(ctx, 72);
    const [live] = await waitlistOfferService.offerFreedSlot(freedContext(ctx, slot));

    const stale = await WaitlistOffer.create({
      waitlist: live.waitlist, patient: live.patient, slot: live.slot, treatment: live.treatment,
      token_hash: "stale-hash", expires_at: new Date(Date.now() - 3600_000), status: "PENDING",
    });

    await runWaitlistOfferExpiryJob();

    expect((await WaitlistOffer.findById(stale._id))!.status).toBe("EXPIRED");
    expect((await WaitlistOffer.findById(live._id))!.status).toBe("PENDING");
  });
});
