import bcrypt from "bcrypt";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { StaffMember } from "../src/models/StaffMember.js";
import { Practitioner } from "../src/models/Practitioner.js";
import { Room } from "../src/models/Room.js";
import { Treatment } from "../src/models/Treatment.js";
import { Patient } from "../src/models/Patient.js";
import { Waitlist } from "../src/models/Waitlist.js";
import { connectTestDb, clearTestDb, disconnectTestDb } from "./helpers/db.js";

const app = createApp();

beforeAll(async () => {
  await connectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

async function loginAsReceptionist(): Promise<string> {
  const staff = await StaffMember.create({ first_name: "Rita", last_name: "Receptionist", gender: "FEMALE", email: "rita@clinic.test", role: "RECEPTIONIST" });
  await User.create({
    email: "rita@clinic.test",
    password_hash: await bcrypt.hash("Password123!", 12),
    role: "RECEPTIONIST",
    staff: staff._id,
  });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "rita@clinic.test", password: "Password123!" })
    .expect(200);

  return res.body.data.accessToken as string;
}

async function seedBookingFixtures() {
  const practitioner = await Practitioner.create({ first_name: "Test", last_name: "Doctor", gender: "OTHER", specialties: ["General"] });
  const room = await Room.create({ name: "Room 1" });
  const treatment = await Treatment.create({ label: "Check-up", default_duration_mins: 30, price: 100 });
  const patient1 = await Patient.create({ first_name: "Patient", last_name: "One", gender: "OTHER", email: "p1@example.test", phone: "0400000001", dob: "1990-01-01" });
  const patient2 = await Patient.create({ first_name: "Patient", last_name: "Two", gender: "OTHER", email: "p2@example.test", phone: "0400000002", dob: "1991-01-01" });
  return { practitioner, room, treatment, patient1, patient2 };
}

describe("booking: double-booking prevention", () => {
  it("rejects a second booking for the same practitioner/room/time", async () => {
    const token = await loginAsReceptionist();
    const { practitioner, room, treatment, patient1, patient2 } = await seedBookingFixtures();
    const startTime = new Date(Date.now() + 24 * 60 * 60_000).toISOString();

    await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patientId: patient1._id.toString(),
        practitionerId: practitioner._id.toString(),
        roomId: room._id.toString(),
        treatmentId: treatment._id.toString(),
        startTime,
      })
      .expect(201);

    const res = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patientId: patient2._id.toString(),
        practitionerId: practitioner._id.toString(),
        roomId: room._id.toString(),
        treatmentId: treatment._id.toString(),
        startTime,
      })
      .expect(409);

    expect(res.body.error.code).toBe("CONFLICT");
  });
});

describe("booking: cancellation frees the slot", () => {
  it("allows rebooking the same practitioner/room/time after cancellation", async () => {
    const token = await loginAsReceptionist();
    const { practitioner, room, treatment, patient1, patient2 } = await seedBookingFixtures();
    const startTime = new Date(Date.now() + 24 * 60 * 60_000).toISOString();

    const first = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patientId: patient1._id.toString(),
        practitionerId: practitioner._id.toString(),
        roomId: room._id.toString(),
        treatmentId: treatment._id.toString(),
        startTime,
      })
      .expect(201);

    await request(app)
      .patch(`/api/appointments/${first.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "cancel" })
      .expect(200);

    await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patientId: patient2._id.toString(),
        practitionerId: practitioner._id.toString(),
        roomId: room._id.toString(),
        treatmentId: treatment._id.toString(),
        startTime,
      })
      .expect(201);
  });
});

describe("booking: waitlist matching on cancellation", () => {
  it("surfaces a matching waitlist entry when an appointment is cancelled", async () => {
    const token = await loginAsReceptionist();
    const { practitioner, room, treatment, patient1, patient2 } = await seedBookingFixtures();
    const startTime = new Date(Date.now() + 24 * 60 * 60_000).toISOString();

    await Waitlist.create({ patient: patient2._id, reason: treatment._id });

    const booking = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patientId: patient1._id.toString(),
        practitionerId: practitioner._id.toString(),
        roomId: room._id.toString(),
        treatmentId: treatment._id.toString(),
        startTime,
      })
      .expect(201);

    const cancelRes = await request(app)
      .patch(`/api/appointments/${booking.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "cancel" })
      .expect(200);

    const matchedPatientIds = cancelRes.body.data.waitlistMatches.map((w: { patient: { _id: string } | string }) =>
      typeof w.patient === "string" ? w.patient : w.patient._id,
    );
    expect(matchedPatientIds).toContain(patient2._id.toString());
  });
});
