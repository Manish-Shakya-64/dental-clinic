import { describe, it, expect, beforeAll, beforeEach, afterAll } from "@jest/globals";
import { Practitioner } from "../src/models/Practitioner.js";
import { Room } from "../src/models/Room.js";
import { Treatment } from "../src/models/Treatment.js";
import { Patient } from "../src/models/Patient.js";
import { Appointment } from "../src/models/Appointment.js";
import { Slot } from "../src/models/Slot.js";
import { StaffMember } from "../src/models/StaffMember.js";
import * as bookingService from "../src/services/bookingService.js";
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

/** A fixed future Wednesday keeps working-hours assertions independent of when the suite runs. */
function nextWednesdayAt(hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + ((3 - d.getDay() + 7) % 7 || 7) + 7);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function fixtures(workingHours?: Record<string, { start: string; end: string }[]>) {
  const [practitioner, roomA, roomB, treatment, p1, p2] = await Promise.all([
    Practitioner.create({
      first_name: "Ada", last_name: "Alpha", gender: "FEMALE", specialties: ["General"],
      ...(workingHours ? { working_hours: workingHours } : {}),
    }),
    Room.create({ name: "Room 1" }),
    Room.create({ name: "Room 2" }),
    Treatment.create({ label: "Check-up", default_duration_mins: 30, price: 100 }),
    Patient.create({ first_name: "Pat", last_name: "One", gender: "OTHER", email: "a@x.test", phone: "0400000001", dob: "1990-01-01" }),
    Patient.create({ first_name: "Pat", last_name: "Two", gender: "OTHER", email: "b@x.test", phone: "0400000002", dob: "1990-01-01" }),
  ]);
  return { practitioner, roomA, roomB, treatment, p1, p2 };
}

type Ctx = Awaited<ReturnType<typeof fixtures>>;

function book(ctx: Ctx, patient: "p1" | "p2", startTime: Date, room?: "roomA" | "roomB") {
  return bookingService.createBooking({
    patientId: ctx[patient]._id.toString(),
    practitionerId: ctx.practitioner._id.toString(),
    roomId: ctx[room ?? "roomA"]._id.toString(),
    treatmentId: ctx.treatment._id.toString(),
    startTime,
  });
}

describe("booking guards: overlapping appointments", () => {
  it("rejects a booking that overlaps an existing one for the same dentist", async () => {
    const ctx = await fixtures();
    await book(ctx, "p1", nextWednesdayAt(10, 0));

    // 10:15-10:45 overlaps 10:00-10:30 but has a different start, so the uniqueness index alone
    // never caught it.
    await expect(book(ctx, "p2", nextWednesdayAt(10, 15))).rejects.toThrow(/overlaps this time/i);
    expect(await Appointment.countDocuments()).toBe(1);
  });

  it("rejects an overlap even when the room differs, because the dentist can't be in two places", async () => {
    const ctx = await fixtures();
    await book(ctx, "p1", nextWednesdayAt(10, 0), "roomA");

    await expect(book(ctx, "p2", nextWednesdayAt(10, 15), "roomB")).rejects.toThrow(/overlaps this time/i);
  });

  it("rejects a second dentist being put in a room that is already in use", async () => {
    const ctx = await fixtures();
    const other = await Practitioner.create({ first_name: "Bo", last_name: "Beta", gender: "MALE", specialties: ["General"] });
    await book(ctx, "p1", nextWednesdayAt(10, 0), "roomA");

    await expect(
      bookingService.createBooking({
        patientId: ctx.p2._id.toString(),
        practitionerId: other._id.toString(),
        roomId: ctx.roomA._id.toString(),
        treatmentId: ctx.treatment._id.toString(),
        startTime: nextWednesdayAt(10, 15),
      }),
    ).rejects.toThrow(/already in use/i);
  });

  it("allows back-to-back appointments, which only touch at the boundary", async () => {
    const ctx = await fixtures();
    await book(ctx, "p1", nextWednesdayAt(10, 0));

    await expect(book(ctx, "p2", nextWednesdayAt(10, 30))).resolves.toBeDefined();
    expect(await Appointment.countDocuments()).toBe(2);
  });

  it("lets a cancelled appointment's time be reused", async () => {
    const ctx = await fixtures();
    const first = await book(ctx, "p1", nextWednesdayAt(10, 0));
    await bookingService.cancelAppointment(first._id.toString());

    await expect(book(ctx, "p2", nextWednesdayAt(10, 15))).resolves.toBeDefined();
  });
});

describe("booking guards: past dates", () => {
  it("rejects a booking in the past", async () => {
    const ctx = await fixtures();
    await expect(book(ctx, "p1", new Date(Date.now() - 86400_000))).rejects.toThrow(/already passed/i);
    expect(await Appointment.countDocuments()).toBe(0);
  });
});

describe("booking guards: working hours", () => {
  const WED_ONLY = { wed: [{ start: "09:00", end: "17:00" }] };

  it("rejects a day the dentist doesn't work", async () => {
    const ctx = await fixtures(WED_ONLY);
    const thursday = nextWednesdayAt(10, 0);
    thursday.setDate(thursday.getDate() + 1);

    await expect(book(ctx, "p1", thursday)).rejects.toThrow(/doesn't work on Thursdays/i);
  });

  it("rejects a time outside the dentist's hours on a day they do work", async () => {
    const ctx = await fixtures(WED_ONLY);
    // 22:22 — the kind of value a free datetime field happily accepts.
    await expect(book(ctx, "p1", nextWednesdayAt(22, 22))).rejects.toThrow(/outside/i);
  });

  it("rejects an appointment that starts inside hours but finishes after closing", async () => {
    const ctx = await fixtures(WED_ONLY);
    // 16:45 + 30min runs to 17:15, past the 17:00 close.
    await expect(book(ctx, "p1", nextWednesdayAt(16, 45))).rejects.toThrow(/outside/i);
  });

  it("accepts a time inside the dentist's hours", async () => {
    const ctx = await fixtures(WED_ONLY);
    await expect(book(ctx, "p1", nextWednesdayAt(10, 0))).resolves.toBeDefined();
  });

  it("treats a dentist with no configured hours as unrestricted", async () => {
    const ctx = await fixtures();
    await expect(book(ctx, "p1", nextWednesdayAt(22, 22))).resolves.toBeDefined();
  });
});

describe("booking guards: rescheduling", () => {
  it("rejects moving an appointment on top of another", async () => {
    const ctx = await fixtures();
    const first = await book(ctx, "p1", nextWednesdayAt(10, 0));
    await book(ctx, "p2", nextWednesdayAt(12, 0));

    await expect(
      bookingService.rescheduleAppointment(first._id.toString(), { startTime: nextWednesdayAt(12, 15) }),
    ).rejects.toThrow(/overlaps this time/i);
  });

  it("does not treat the appointment being moved as a clash with itself", async () => {
    const ctx = await fixtures();
    const appt = await book(ctx, "p1", nextWednesdayAt(10, 0));

    // Nudging by 15 minutes overlaps its own current window.
    await expect(
      bookingService.rescheduleAppointment(appt._id.toString(), { startTime: nextWednesdayAt(10, 15) }),
    ).resolves.toBeDefined();
  });

  it("rejects rescheduling into the past", async () => {
    const ctx = await fixtures();
    const appt = await book(ctx, "p1", nextWednesdayAt(10, 0));

    await expect(
      bookingService.rescheduleAppointment(appt._id.toString(), { startTime: new Date(Date.now() - 3600_000) }),
    ).rejects.toThrow(/already passed/i);
  });
});

describe("booking guards: existing slot-based paths must keep working", () => {
  /** The patient wizard, the reception slot picker and accepting a waitlist offer all book through
   *  a Slot. Enforcing the roster on those would make an admin-created slot visible but unbookable,
   *  so a slot booking is exempt from the working-hours rule. */
  it("books a slot that sits outside the dentist's rostered hours", async () => {
    const ctx = await fixtures({ wed: [{ start: "09:00", end: "17:00" }] });
    const staff = await StaffMember.create({
      first_name: "Ava", last_name: "Admin", gender: "FEMALE", email: "ava@clinic.test", role: "ADMIN",
    });
    const start = nextWednesdayAt(19, 0); // after hours, but the admin created the slot deliberately
    const slot = await Slot.create({
      practitioner: ctx.practitioner._id, room: ctx.roomA._id,
      start_time: start, end_time: new Date(start.getTime() + 30 * 60_000),
      status: "OPEN", created_by: staff._id,
    });

    const appointment = await bookingService.createBooking({
      patientId: ctx.p1._id.toString(),
      practitionerId: ctx.practitioner._id.toString(),
      roomId: ctx.roomA._id.toString(),
      treatmentId: ctx.treatment._id.toString(),
      startTime: start,
      slotId: slot._id.toString(),
    });

    expect(appointment.status).toBe("CONFIRMED");
    expect((await Slot.findById(slot._id))!.status).toBe("BOOKED");
  });

  it("still blocks a slot booking that would overlap an existing appointment", async () => {
    const ctx = await fixtures();
    const staff = await StaffMember.create({
      first_name: "Ava", last_name: "Admin", gender: "FEMALE", email: "ava2@clinic.test", role: "ADMIN",
    });
    await book(ctx, "p1", nextWednesdayAt(10, 0));

    const start = nextWednesdayAt(10, 15);
    const slot = await Slot.create({
      practitioner: ctx.practitioner._id, room: ctx.roomA._id,
      start_time: start, end_time: new Date(start.getTime() + 30 * 60_000),
      status: "OPEN", created_by: staff._id,
    });

    await expect(
      bookingService.createBooking({
        patientId: ctx.p2._id.toString(),
        practitionerId: ctx.practitioner._id.toString(),
        roomId: ctx.roomA._id.toString(),
        treatmentId: ctx.treatment._id.toString(),
        startTime: start,
        slotId: slot._id.toString(),
      }),
    ).rejects.toThrow(/overlaps this time/i);
  });
});
