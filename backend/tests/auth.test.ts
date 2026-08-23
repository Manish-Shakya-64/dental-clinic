import crypto from "node:crypto";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { blindIndex } from "../src/utils/blindIndex.js";
import { connectTestDb, clearTestDb, disconnectTestDb } from "./helpers/db.js";

const app = createApp();

const patientPayload = {
  first_name: "Test",
  last_name: "Patient",
  gender: "OTHER",
  email: "patient@example.test",
  password: "Password123!",
  phone: "0411000099",
  dob: "1990-01-01",
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

describe("auth: login", () => {
  it("logs in successfully with correct credentials", async () => {
    await request(app).post("/api/auth/register").send(patientPayload).expect(201);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: patientPayload.email, password: patientPayload.password })
      .expect(200);

    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
    expect(res.body.data.user.role).toBe("PATIENT");
  });

  it("rejects login with the wrong password", async () => {
    await request(app).post("/api/auth/register").send(patientPayload).expect(201);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: patientPayload.email, password: "wrong-password" })
      .expect(401);

    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("auth: forgot / reset password", () => {
  it("always returns a generic message and sets a reset token hash when the account exists", async () => {
    await request(app).post("/api/auth/register").send(patientPayload).expect(201);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: patientPayload.email })
      .expect(200);

    expect(res.body.data.message).toMatch(/if that account exists/i);

    const user = await User.findOne({ email_hash: blindIndex(patientPayload.email) }).select("+reset_token_hash +reset_token_expires");
    expect(user?.reset_token_hash).toEqual(expect.any(String));
    expect(user?.reset_token_expires && user.reset_token_expires.getTime() > Date.now()).toBe(true);
  });

  it("returns the same generic message for an unknown email (no account enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@example.test" })
      .expect(200);

    expect(res.body.data.message).toMatch(/if that account exists/i);
  });

  it("resets the password with a valid token and invalidates it after use", async () => {
    await request(app).post("/api/auth/register").send(patientPayload).expect(201);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await User.findOne({ email_hash: blindIndex(patientPayload.email) });
    user!.reset_token_hash = tokenHash;
    user!.reset_token_expires = new Date(Date.now() + 30 * 60_000);
    await user!.save();

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, newPassword: "NewPassword456!" })
      .expect(200);

    await request(app)
      .post("/api/auth/login")
      .send({ email: patientPayload.email, password: "NewPassword456!" })
      .expect(200);

    await request(app)
      .post("/api/auth/login")
      .send({ email: patientPayload.email, password: patientPayload.password })
      .expect(401);

    // The token is single-use: replaying it must fail.
    await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, newPassword: "AnotherPassword789!" })
      .expect(400);
  });
});

describe("auth: RBAC", () => {
  it("rejects a patient trying to create a treatment (ADMIN-only route)", async () => {
    await request(app).post("/api/auth/register").send(patientPayload).expect(201);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: patientPayload.email, password: patientPayload.password })
      .expect(200);

    const res = await request(app)
      .post("/api/treatments")
      .set("Authorization", `Bearer ${login.body.data.accessToken}`)
      .send({ label: "Filling", default_duration_mins: 45, price: 250 })
      .expect(403);

    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});
