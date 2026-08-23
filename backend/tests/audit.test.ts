import bcrypt from "bcrypt";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { createApp } from "../src/app.js";
import { AuditLog } from "../src/models/AuditLog.js";
import { User } from "../src/models/User.js";
import { StaffMember } from "../src/models/StaffMember.js";
import { connectTestDb, clearTestDb, disconnectTestDb } from "./helpers/db.js";

const app = createApp();

const patientPayload = {
  first_name: "Audit",
  last_name: "Test Patient",
  gender: "OTHER",
  email: "audit-patient@example.test",
  password: "Password123!",
  phone: "0422000001",
  dob: "1992-02-02",
};

beforeAll(async () => {
  await connectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

describe("audit log: one entry per audited action", () => {
  it("writes exactly one LOGIN_SUCCESS entry on a successful login", async () => {
    await request(app).post("/api/auth/register").send(patientPayload).expect(201);

    await request(app)
      .post("/api/auth/login")
      .send({ email: patientPayload.email, password: patientPayload.password })
      .expect(200);

    const entries = await AuditLog.find({ action: "LOGIN_SUCCESS" });
    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe("SUCCESS");
  });

  it("writes exactly one LOGIN_FAILURE entry on a failed login", async () => {
    await request(app).post("/api/auth/register").send(patientPayload).expect(201);

    await request(app)
      .post("/api/auth/login")
      .send({ email: patientPayload.email, password: "wrong-password" })
      .expect(401);

    const entries = await AuditLog.find({ action: "LOGIN_FAILURE" });
    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe("FAILURE");
  });

  it("writes exactly one PATIENT_CREATED entry when reception staff creates a patient record", async () => {
    const staff = await StaffMember.create({ first_name: "Rita", gender: "FEMALE", email: "rita2@clinic.test", role: "RECEPTIONIST" });
    await User.create({
      email: "rita2@clinic.test",
      password_hash: await bcrypt.hash("Password123!", 12),
      role: "RECEPTIONIST",
      staff: staff._id,
    });
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "rita2@clinic.test", password: "Password123!" })
      .expect(200);

    await request(app)
      .post("/api/patients")
      .set("Authorization", `Bearer ${login.body.data.accessToken}`)
      .send({ first_name: "Walk-in", last_name: "Patient", gender: "OTHER", email: "walkin@example.test", phone: "0433000001", dob: "1985-05-05" })
      .expect(201);

    const entries = await AuditLog.find({ action: "PATIENT_CREATED" });
    expect(entries).toHaveLength(1);
  });
});

describe("audit log: append-only", () => {
  it("rejects updateOne, deleteOne, and updateMany at the model level", async () => {
    const entry = await AuditLog.create({
      actor: { role: "SYSTEM", displayName: "test" },
      action: "TEST_ACTION",
      resourceType: "Test",
      status: "SUCCESS",
    });

    await expect(AuditLog.updateOne({ _id: entry._id }, { $set: { action: "TAMPERED" } })).rejects.toThrow(/append-only/i);
    await expect(AuditLog.deleteOne({ _id: entry._id })).rejects.toThrow(/append-only/i);
    await expect(AuditLog.updateMany({}, { $set: { status: "FAILURE" } })).rejects.toThrow(/append-only/i);

    const stillThere = await AuditLog.findById(entry._id);
    expect(stillThere?.action).toBe("TEST_ACTION");
  });

  it("exposes no PATCH or DELETE route on /api/audit-logs", async () => {
    const staff = await StaffMember.create({ first_name: "Ava", last_name: "Admin", gender: "FEMALE", email: "admin-audit@clinic.test", role: "ADMIN" });
    await User.create({
      email: "admin-audit@clinic.test",
      password_hash: await bcrypt.hash("Password123!", 12),
      role: "ADMIN",
      staff: staff._id,
    });
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin-audit@clinic.test", password: "Password123!" })
      .expect(200);

    await request(app)
      .patch("/api/audit-logs/000000000000000000000000")
      .set("Authorization", `Bearer ${login.body.data.accessToken}`)
      .expect(404);

    await request(app)
      .delete("/api/audit-logs/000000000000000000000000")
      .set("Authorization", `Bearer ${login.body.data.accessToken}`)
      .expect(404);
  });
});
