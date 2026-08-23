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
import { Appointment } from "../src/models/Appointment.js";
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

const PASSWORD = "Password123!";

async function login(email: string): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
  return res.body.data.accessToken as string;
}

/** One clinic with two dentists, two patients, and a visit for each patient — enough to prove the
 *  admin sees across boundaries that scope a doctor or patient down to their own records. */
async function seedClinic() {
  const staff = await StaffMember.create({
    first_name: "Ava",
    last_name: "Admin",
    gender: "FEMALE",
    email: "ava@clinic.test",
    role: "ADMIN",
  });
  await User.create({ email: "ava@clinic.test", password_hash: await bcrypt.hash(PASSWORD, 12), role: "ADMIN", staff: staff._id });

  const [docA, docB] = await Promise.all([
    Practitioner.create({ first_name: "Ada", last_name: "Alpha", gender: "FEMALE", specialties: ["General"] }),
    Practitioner.create({ first_name: "Bo", last_name: "Beta", gender: "MALE", specialties: ["General"] }),
  ]);
  await User.create({
    email: "ada@clinic.test",
    password_hash: await bcrypt.hash(PASSWORD, 12),
    role: "DOCTOR",
    practitioner: docA._id,
  });

  const room = await Room.create({ name: "Room 1" });
  const treatment = await Treatment.create({ label: "Check-up", default_duration_mins: 30, price: 100 });

  const [patient1, patient2] = await Promise.all([
    Patient.create({
      first_name: "Pat",
      last_name: "One",
      gender: "OTHER",
      email: "p1@example.test",
      phone: "0400000001",
      dob: "1990-01-01",
      medical_history: "Penicillin allergy",
    }),
    Patient.create({ first_name: "Pat", last_name: "Two", gender: "OTHER", email: "p2@example.test", phone: "0400000002", dob: "1991-01-01" }),
  ]);
  await User.create({
    email: "p1@example.test",
    password_hash: await bcrypt.hash(PASSWORD, 12),
    role: "PATIENT",
    patient: patient1._id,
  });

  const base = new Date("2030-06-03T09:00:00.000Z");
  const visitA = await Appointment.create({
    appointment_code: "APT-TEST-0001",
    patient: patient1._id,
    practitioner: docA._id,
    room: room._id,
    reason: treatment._id,
    start_time: base,
    end_time: new Date(base.getTime() + 30 * 60_000),
    status: "COMPLETED",
    clinical_note: { note_text: "Mild gingivitis, advised flossing.", created_at: base },
    medicines: [{ name: "Amoxicillin", dosage: "500mg", instructions: "Twice daily for 5 days" }],
  });

  const visitB = await Appointment.create({
    appointment_code: "APT-TEST-0002",
    patient: patient2._id,
    practitioner: docB._id,
    room: room._id,
    reason: treatment._id,
    start_time: new Date(base.getTime() + 60 * 60_000),
    end_time: new Date(base.getTime() + 90 * 60_000),
    status: "CONFIRMED",
  });

  return { docA, docB, patient1, patient2, visitA, visitB, room, treatment };
}

describe("admin: clinic-wide appointment visibility", () => {
  it("lists appointments across every dentist and patient", async () => {
    const { visitA, visitB } = await seedClinic();
    const token = await login("ava@clinic.test");

    const res = await request(app).get("/api/appointments").set("Authorization", `Bearer ${token}`).expect(200);

    const codes = res.body.data.map((a: { appointment_code: string }) => a.appointment_code);
    expect(codes).toEqual(expect.arrayContaining([visitA.appointment_code, visitB.appointment_code]));
    expect(res.body.pagination.total).toBe(2);
  });

  it("scopes a doctor to their own appointments, unlike the admin", async () => {
    const { visitA, visitB } = await seedClinic();
    const doctorToken = await login("ada@clinic.test");

    const res = await request(app).get("/api/appointments").set("Authorization", `Bearer ${doctorToken}`).expect(200);

    const codes = res.body.data.map((a: { appointment_code: string }) => a.appointment_code);
    expect(codes).toContain(visitA.appointment_code);
    expect(codes).not.toContain(visitB.appointment_code);
  });

  it("scopes a patient to their own appointments, unlike the admin", async () => {
    const { visitA, visitB } = await seedClinic();
    const patientToken = await login("p1@example.test");

    const res = await request(app).get("/api/appointments").set("Authorization", `Bearer ${patientToken}`).expect(200);

    const codes = res.body.data.map((a: { appointment_code: string }) => a.appointment_code);
    expect(codes).toContain(visitA.appointment_code);
    expect(codes).not.toContain(visitB.appointment_code);
  });

  it("filters by patient, dentist, and status for the admin list screen", async () => {
    const { docB, patient2, visitB } = await seedClinic();
    const token = await login("ava@clinic.test");

    const byPatient = await request(app)
      .get(`/api/appointments?patient=${patient2._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(byPatient.body.data).toHaveLength(1);
    expect(byPatient.body.data[0].appointment_code).toBe(visitB.appointment_code);

    const byDoctor = await request(app)
      .get(`/api/appointments?practitioner=${docB._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(byDoctor.body.data).toHaveLength(1);

    const byStatus = await request(app).get("/api/appointments?status=COMPLETED").set("Authorization", `Bearer ${token}`).expect(200);
    expect(byStatus.body.data).toHaveLength(1);
    expect(byStatus.body.data[0].status).toBe("COMPLETED");
  });

  it("looks an appointment up by its code", async () => {
    const { visitA } = await seedClinic();
    const token = await login("ava@clinic.test");

    const res = await request(app)
      .get(`/api/appointments?code=${visitA.appointment_code}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]._id).toBe(visitA._id.toString());
  });
});

describe("admin: appointment detail with notes and medicines", () => {
  it("returns the decrypted clinical note and prescription for any appointment", async () => {
    const { visitA } = await seedClinic();
    const token = await login("ava@clinic.test");

    const res = await request(app).get(`/api/appointments/${visitA._id}`).set("Authorization", `Bearer ${token}`).expect(200);

    expect(res.body.data.clinical_note.note_text).toBe("Mild gingivitis, advised flossing.");
    expect(res.body.data.medicines).toHaveLength(1);
    expect(res.body.data.medicines[0]).toMatchObject({
      name: "Amoxicillin",
      dosage: "500mg",
      instructions: "Twice daily for 5 days",
    });
  });

  it("populates the patient, dentist, room, and treatment the detail screen renders", async () => {
    const { visitA } = await seedClinic();
    const token = await login("ava@clinic.test");

    const res = await request(app).get(`/api/appointments/${visitA._id}`).set("Authorization", `Bearer ${token}`).expect(200);

    const { patient, practitioner, room, reason } = res.body.data;
    expect(patient.first_name).toBe("Pat");
    expect(patient.medical_history).toBe("Penicillin allergy");
    expect(practitioner.first_name).toBe("Ada");
    expect(room.name).toBe("Room 1");
    expect(reason.label).toBe("Check-up");
  });

  it("lets the admin open an appointment belonging to a different dentist", async () => {
    const { visitB } = await seedClinic();
    const token = await login("ava@clinic.test");

    await request(app).get(`/api/appointments/${visitB._id}`).set("Authorization", `Bearer ${token}`).expect(200);
  });

  it("still blocks a patient from opening someone else's appointment", async () => {
    const { visitB } = await seedClinic();
    const patientToken = await login("p1@example.test");

    await request(app).get(`/api/appointments/${visitB._id}`).set("Authorization", `Bearer ${patientToken}`).expect(403);
  });
});

describe("admin: patient management", () => {
  it("lists and opens any patient record", async () => {
    const { patient2 } = await seedClinic();
    const token = await login("ava@clinic.test");

    const list = await request(app).get("/api/patients").set("Authorization", `Bearer ${token}`).expect(200);
    expect(list.body.pagination.total).toBe(2);

    const detail = await request(app).get(`/api/patients/${patient2._id}`).set("Authorization", `Bearer ${token}`).expect(200);
    expect(detail.body.data.last_name).toBe("Two");
  });

  it("updates a patient's profile", async () => {
    const { patient2 } = await seedClinic();
    const token = await login("ava@clinic.test");

    await request(app)
      .patch(`/api/patients/${patient2._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ phone: "0400999888", medical_history: "Updated by admin" })
      .expect(200);

    const updated = await Patient.findById(patient2._id);
    expect(updated!.phone).toBe("0400999888");
    expect(updated!.medical_history).toBe("Updated by admin");
  });

  it("does not let a doctor edit a patient record", async () => {
    const { patient2 } = await seedClinic();
    const doctorToken = await login("ada@clinic.test");

    await request(app)
      .patch(`/api/patients/${patient2._id}`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ phone: "0400000000" })
      .expect(403);
  });
});

describe("admin-only endpoints stay closed to other roles", () => {
  it("refuses slot creation for a doctor", async () => {
    const { docA, room } = await seedClinic();
    const doctorToken = await login("ada@clinic.test");

    await request(app)
      .post("/api/slots")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        practitionerId: docA._id.toString(),
        roomId: room._id.toString(),
        startTime: new Date("2030-07-01T09:00:00.000Z").toISOString(),
        endTime: new Date("2030-07-01T09:30:00.000Z").toISOString(),
      })
      .expect(403);
  });

  it("refuses the dashboard report for a patient", async () => {
    await seedClinic();
    const patientToken = await login("p1@example.test");

    await request(app).get("/api/reports/dashboard").set("Authorization", `Bearer ${patientToken}`).expect(403);
  });
});
