import { describe, it, expect, beforeAll, beforeEach, afterAll } from "@jest/globals";
import { Practitioner } from "../src/models/Practitioner.js";
import { Room } from "../src/models/Room.js";
import { Treatment } from "../src/models/Treatment.js";
import { Patient } from "../src/models/Patient.js";
import { Appointment, AppointmentStatus } from "../src/models/Appointment.js";
import { runNoShowSweepJob } from "../src/jobs/noShowSweepJob.js";
import { runReminderJob } from "../src/jobs/reminderJob.js";
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
  const [practitioner, room, treatment, patient] = await Promise.all([
    Practitioner.create({ first_name: "Ada", last_name: "Alpha", gender: "FEMALE", specialties: ["General"] }),
    Room.create({ name: "Room 1" }),
    Treatment.create({ label: "Check-up", default_duration_mins: 30, price: 100 }),
    Patient.create({ first_name: "Pat", last_name: "One", gender: "OTHER", email: "p1@example.test", phone: "0400000001", dob: "1990-01-01" }),
  ]);
  return { practitioner, room, treatment, patient };
}

let seq = 0;
async function makeAppointment(
  ctx: Awaited<ReturnType<typeof fixtures>>,
  status: AppointmentStatus,
  startsInHours: number,
  durationMins = 30,
) {
  const start = new Date(Date.now() + startsInHours * 60 * 60_000);
  return Appointment.create({
    appointment_code: `APT-TEST-${String(++seq).padStart(4, "0")}`,
    patient: ctx.patient._id,
    practitioner: ctx.practitioner._id,
    room: ctx.room._id,
    reason: ctx.treatment._id,
    start_time: start,
    end_time: new Date(start.getTime() + durationMins * 60_000),
    status,
  });
}

describe("no-show sweep: appointments nobody checked in", () => {
  it("closes out a pre-visit appointment once the grace period has passed", async () => {
    const ctx = await fixtures();
    const appt = await makeAppointment(ctx, "CONFIRMED", -(env.NO_SHOW_GRACE_HOURS + 2));

    await runNoShowSweepJob();

    const after = await Appointment.findById(appt._id);
    expect(after!.status).toBe("NO_SHOW");
  });

  it("sweeps REMINDED and RECONFIRMED too, not just CONFIRMED", async () => {
    const ctx = await fixtures();
    const reminded = await makeAppointment(ctx, "REMINDED", -(env.NO_SHOW_GRACE_HOURS + 2));
    const reconfirmed = await makeAppointment(ctx, "RECONFIRMED", -(env.NO_SHOW_GRACE_HOURS + 3));

    await runNoShowSweepJob();

    expect((await Appointment.findById(reminded._id))!.status).toBe("NO_SHOW");
    expect((await Appointment.findById(reconfirmed._id))!.status).toBe("NO_SHOW");
  });

  it("frees the slot, so the same practitioner/room/time can be booked again", async () => {
    const ctx = await fixtures();
    const appt = await makeAppointment(ctx, "CONFIRMED", -(env.NO_SHOW_GRACE_HOURS + 2));
    expect(appt.is_blocking_slot).toBe(true);

    await runNoShowSweepJob();

    const after = await Appointment.findById(appt._id);
    // is_blocking_slot is what the partial unique index keys off — if the sweep didn't recalculate
    // it, the dead appointment would keep its slot reserved forever.
    expect(after!.is_blocking_slot).toBe(false);
  });

  it("leaves an appointment alone while it is still inside the grace period", async () => {
    const ctx = await fixtures();
    const appt = await makeAppointment(ctx, "CONFIRMED", -1);

    await runNoShowSweepJob();

    expect((await Appointment.findById(appt._id))!.status).toBe("CONFIRMED");
  });

  it("never touches a future appointment", async () => {
    const ctx = await fixtures();
    const appt = await makeAppointment(ctx, "CONFIRMED", 48);

    await runNoShowSweepJob();

    expect((await Appointment.findById(appt._id))!.status).toBe("CONFIRMED");
  });

  it("does not mark a patient who actually arrived as a no-show", async () => {
    const ctx = await fixtures();
    // WAITING means reception checked them in — the visit just never got completed. Closing that
    // as a no-show would put a false record against the patient.
    const waiting = await makeAppointment(ctx, "WAITING", -(env.NO_SHOW_GRACE_HOURS + 24));

    await runNoShowSweepJob();

    expect((await Appointment.findById(waiting._id))!.status).toBe("WAITING");
  });

  it("leaves already-finished appointments untouched", async () => {
    const ctx = await fixtures();
    const done: AppointmentStatus[] = ["COMPLETED", "BILLED", "CHECKED_OUT", "RECALL_SCHEDULED", "CANCELLED", "NO_SHOW"];
    const made = [];
    for (const status of done) made.push(await makeAppointment(ctx, status, -(env.NO_SHOW_GRACE_HOURS + 48)));

    await runNoShowSweepJob();

    for (let i = 0; i < made.length; i++) {
      expect((await Appointment.findById(made[i]._id))!.status).toBe(done[i]);
    }
  });

  it("is safe to run repeatedly", async () => {
    const ctx = await fixtures();
    const appt = await makeAppointment(ctx, "CONFIRMED", -(env.NO_SHOW_GRACE_HOURS + 2));

    await runNoShowSweepJob();
    await runNoShowSweepJob();

    expect((await Appointment.findById(appt._id))!.status).toBe("NO_SHOW");
    expect(await Appointment.countDocuments({ status: "NO_SHOW" })).toBe(1);
  });
});

describe("reminders: rescheduled appointments", () => {
  /** The job looks for appointments entering the reminder window during the 15 minutes after it
   *  runs, so a fixture has to land a few minutes inside that window to be picked up. */
  const intoWindow = (offsetMinutes: number) => env.REMINDER_HOURS_BEFORE + offsetMinutes / 60;

  it("reminds a rescheduled (RECONFIRMED) appointment", async () => {
    const ctx = await fixtures();
    const appt = await makeAppointment(ctx, "RECONFIRMED", intoWindow(5));

    await runReminderJob();

    expect((await Appointment.findById(appt._id))!.status).toBe("REMINDED");
  });

  it("still reminds a normally-booked (CONFIRMED) appointment", async () => {
    const ctx = await fixtures();
    const appt = await makeAppointment(ctx, "CONFIRMED", intoWindow(5));

    await runReminderJob();

    expect((await Appointment.findById(appt._id))!.status).toBe("REMINDED");
  });

  it("does not remind twice", async () => {
    const ctx = await fixtures();
    const appt = await makeAppointment(ctx, "REMINDED", intoWindow(5));

    await runReminderJob();

    expect((await Appointment.findById(appt._id))!.status).toBe("REMINDED");
    expect(await Appointment.countDocuments({ status: "REMINDED" })).toBe(1);
  });

  it("ignores an appointment outside the reminder window", async () => {
    const ctx = await fixtures();
    const appt = await makeAppointment(ctx, "CONFIRMED", env.REMINDER_HOURS_BEFORE + 5);

    await runReminderJob();

    expect((await Appointment.findById(appt._id))!.status).toBe("CONFIRMED");
  });
});

describe("appointment status reachability", () => {
  it("documents CHECKED_IN and IN_CONSULT as defined but unreachable", () => {
    // Both exist in the schema enum and the UI colour map, but no controller, service or job ever
    // assigns them: check-in goes straight to WAITING and the doctor sets COMPLETED. This test
    // pins that down so the next person doesn't assume they're part of the live flow.
    const schemaStatuses = (Appointment.schema.path("status") as unknown as { enumValues: string[] }).enumValues;
    expect(schemaStatuses).toContain("CHECKED_IN");
    expect(schemaStatuses).toContain("IN_CONSULT");

    const reachable = new Set<AppointmentStatus>([
      "DRAFT", "LOCK_EXPIRED", "CONFIRMED", "REMINDED", "RECONFIRMED",
      "WAITING", "COMPLETED", "BILLED", "CHECKED_OUT", "RECALL_SCHEDULED",
      "CANCELLED", "NO_SHOW",
    ]);
    const unreachable = schemaStatuses.filter((s) => !reachable.has(s as AppointmentStatus));
    expect(unreachable).toEqual(["CHECKED_IN", "IN_CONSULT"]);
  });
});
