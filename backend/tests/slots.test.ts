import bcrypt from "bcrypt";
import { Types } from "mongoose";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { StaffMember } from "../src/models/StaffMember.js";
import { Practitioner } from "../src/models/Practitioner.js";
import { Room } from "../src/models/Room.js";
import { Slot } from "../src/models/Slot.js";
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

/** Returns the staff id alongside the token because StaffMember.email is blind-indexed — tests
 *  that need the id for a `created_by` ref can't look it up by plaintext email afterwards. */
async function loginAsAdmin(): Promise<{ token: string; staffId: Types.ObjectId }> {
  const staff = await StaffMember.create({
    first_name: "Ava",
    last_name: "Admin",
    gender: "FEMALE",
    email: "ava@clinic.test",
    role: "ADMIN",
  });
  await User.create({
    email: "ava@clinic.test",
    password_hash: await bcrypt.hash("Password123!", 12),
    role: "ADMIN",
    staff: staff._id,
  });

  const res = await request(app).post("/api/auth/login").send({ email: "ava@clinic.test", password: "Password123!" }).expect(200);
  return { token: res.body.data.accessToken as string, staffId: staff._id };
}

async function seedSlotFixtures() {
  const [doctorA, doctorB] = await Promise.all([
    Practitioner.create({ first_name: "Ada", last_name: "Alpha", gender: "FEMALE", specialties: ["General"] }),
    Practitioner.create({ first_name: "Bo", last_name: "Beta", gender: "MALE", specialties: ["General"] }),
  ]);
  const [roomA, roomB] = await Promise.all([Room.create({ name: "Room 1" }), Room.create({ name: "Room 2" })]);
  return { doctorA, doctorB, roomA, roomB };
}

/** A fixed far-future anchor keeps every case independent of when the suite runs. */
const ANCHOR = new Date("2030-06-03T09:00:00.000Z");
const at = (minutesFromAnchor: number) => new Date(ANCHOR.getTime() + minutesFromAnchor * 60_000).toISOString();

function createSlot(
  token: string,
  body: { practitionerId: string; roomId: string; startTime: string; endTime: string; repeatWeeks?: number },
) {
  return request(app).post("/api/slots").set("Authorization", `Bearer ${token}`).send(body);
}

describe("slots: overlap prevention", () => {
  it("rejects an exact duplicate of an existing slot", async () => {
    const { token } = await loginAsAdmin();
    const { doctorA, roomA } = await seedSlotFixtures();
    const body = {
      practitionerId: doctorA._id.toString(),
      roomId: roomA._id.toString(),
      startTime: at(0),
      endTime: at(30),
    };

    await createSlot(token, body).expect(201);
    const res = await createSlot(token, body).expect(409);

    expect(res.body.error.code).toBe("CONFLICT");
    expect(await Slot.countDocuments()).toBe(1);
  });

  it("rejects the same dentist in a different room at an overlapping time", async () => {
    const { token } = await loginAsAdmin();
    const { doctorA, roomA, roomB } = await seedSlotFixtures();

    await createSlot(token, {
      practitionerId: doctorA._id.toString(),
      roomId: roomA._id.toString(),
      startTime: at(0),
      endTime: at(30),
    }).expect(201);

    const res = await createSlot(token, {
      practitionerId: doctorA._id.toString(),
      roomId: roomB._id.toString(),
      startTime: at(15),
      endTime: at(45),
    }).expect(409);

    expect(res.body.error.message).toMatch(/dentist can't be double-booked/i);
  });

  it("rejects a different dentist in the same room at an overlapping time", async () => {
    const { token } = await loginAsAdmin();
    const { doctorA, doctorB, roomA } = await seedSlotFixtures();

    await createSlot(token, {
      practitionerId: doctorA._id.toString(),
      roomId: roomA._id.toString(),
      startTime: at(0),
      endTime: at(30),
    }).expect(201);

    const res = await createSlot(token, {
      practitionerId: doctorB._id.toString(),
      roomId: roomA._id.toString(),
      startTime: at(15),
      endTime: at(45),
    }).expect(409);

    expect(res.body.error.message).toMatch(/room can't host two dentists/i);
  });

  it("treats a BOOKED or BLOCKED slot as occupied, not just OPEN ones", async () => {
    const { token, staffId } = await loginAsAdmin();
    const { doctorA, roomA } = await seedSlotFixtures();

    await Slot.create({
      practitioner: doctorA._id,
      room: roomA._id,
      start_time: new Date(at(0)),
      end_time: new Date(at(30)),
      status: "BLOCKED",
      created_by: staffId,
    });

    await createSlot(token, {
      practitionerId: doctorA._id.toString(),
      roomId: roomA._id.toString(),
      startTime: at(0),
      endTime: at(30),
    }).expect(409);
  });

  it("allows back-to-back slots, since the window is half-open", async () => {
    const { token } = await loginAsAdmin();
    const { doctorA, roomA } = await seedSlotFixtures();

    await createSlot(token, {
      practitionerId: doctorA._id.toString(),
      roomId: roomA._id.toString(),
      startTime: at(0),
      endTime: at(30),
    }).expect(201);

    await createSlot(token, {
      practitionerId: doctorA._id.toString(),
      roomId: roomA._id.toString(),
      startTime: at(30),
      endTime: at(60),
    }).expect(201);

    expect(await Slot.countDocuments()).toBe(2);
  });

  it("allows the same time when both the dentist and the room differ", async () => {
    const { token } = await loginAsAdmin();
    const { doctorA, doctorB, roomA, roomB } = await seedSlotFixtures();

    await createSlot(token, {
      practitionerId: doctorA._id.toString(),
      roomId: roomA._id.toString(),
      startTime: at(0),
      endTime: at(30),
    }).expect(201);

    await createSlot(token, {
      practitionerId: doctorB._id.toString(),
      roomId: roomB._id.toString(),
      startTime: at(0),
      endTime: at(30),
    }).expect(201);
  });
});

describe("slots: window sanity rules", () => {
  it("rejects an end time that precedes the start", async () => {
    const { token } = await loginAsAdmin();
    const { doctorA, roomA } = await seedSlotFixtures();

    const res = await createSlot(token, {
      practitionerId: doctorA._id.toString(),
      roomId: roomA._id.toString(),
      startTime: at(60),
      endTime: at(30),
    }).expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a slot shorter than the 5-minute minimum", async () => {
    const { token } = await loginAsAdmin();
    const { doctorA, roomA } = await seedSlotFixtures();

    const res = await createSlot(token, {
      practitionerId: doctorA._id.toString(),
      roomId: roomA._id.toString(),
      startTime: at(0),
      endTime: at(2),
    }).expect(400);

    expect(res.body.error.message).toMatch(/at least 5 minutes/i);
  });

  it("rejects a slot longer than 24 hours, which is usually a mistyped date", async () => {
    const { token } = await loginAsAdmin();
    const { doctorA, roomA } = await seedSlotFixtures();

    const res = await createSlot(token, {
      practitionerId: doctorA._id.toString(),
      roomId: roomA._id.toString(),
      startTime: at(0),
      endTime: at(48 * 60),
    }).expect(400);

    expect(res.body.error.message).toMatch(/longer than 24 hours/i);
  });
});

describe("slots: reference integrity", () => {
  it("rejects a dentist id that doesn't exist", async () => {
    const { token } = await loginAsAdmin();
    const { roomA } = await seedSlotFixtures();

    await createSlot(token, {
      practitionerId: "0123456789abcdef01234567",
      roomId: roomA._id.toString(),
      startTime: at(0),
      endTime: at(30),
    }).expect(404);

    expect(await Slot.countDocuments()).toBe(0);
  });

  it("rejects a room id that doesn't exist", async () => {
    const { token } = await loginAsAdmin();
    const { doctorA } = await seedSlotFixtures();

    await createSlot(token, {
      practitionerId: doctorA._id.toString(),
      roomId: "0123456789abcdef01234567",
      startTime: at(0),
      endTime: at(30),
    }).expect(404);
  });

  it("rejects scheduling for a deactivated dentist", async () => {
    const { token } = await loginAsAdmin();
    const { doctorA, roomA } = await seedSlotFixtures();
    await Practitioner.findByIdAndUpdate(doctorA._id, { is_active: false });

    const res = await createSlot(token, {
      practitionerId: doctorA._id.toString(),
      roomId: roomA._id.toString(),
      startTime: at(0),
      endTime: at(30),
    }).expect(400);

    expect(res.body.error.message).toMatch(/deactivated/i);
  });
});

describe("slots: repeat weekly", () => {
  it("creates each occurrence exactly seven days apart", async () => {
    const { token } = await loginAsAdmin();
    const { doctorA, roomA } = await seedSlotFixtures();

    await createSlot(token, {
      practitionerId: doctorA._id.toString(),
      roomId: roomA._id.toString(),
      startTime: at(0),
      endTime: at(30),
      repeatWeeks: 4,
    }).expect(201);

    const slots = await Slot.find().sort({ start_time: 1 });
    expect(slots).toHaveLength(4);
    for (let i = 1; i < slots.length; i++) {
      const gapDays = (slots[i].start_time.getTime() - slots[i - 1].start_time.getTime()) / (24 * 60 * 60_000);
      expect(gapDays).toBe(7);
    }
  });

  it("rejects the whole series atomically when a later occurrence collides", async () => {
    const { token } = await loginAsAdmin();
    const { doctorA, roomA } = await seedSlotFixtures();
    const WEEK_MINUTES = 7 * 24 * 60;

    // Occupy what would be week 3 of the series.
    await createSlot(token, {
      practitionerId: doctorA._id.toString(),
      roomId: roomA._id.toString(),
      startTime: at(2 * WEEK_MINUTES),
      endTime: at(2 * WEEK_MINUTES + 30),
    }).expect(201);

    await createSlot(token, {
      practitionerId: doctorA._id.toString(),
      roomId: roomA._id.toString(),
      startTime: at(0),
      endTime: at(30),
      repeatWeeks: 4,
    }).expect(409);

    // Only the pre-existing blocker survives — no partial series was written.
    expect(await Slot.countDocuments()).toBe(1);
  });
});

describe("slots: update and delete guards", () => {
  async function createOpenSlot(token: string, practitionerId: string, roomId: string, from: number, to: number) {
    const res = await createSlot(token, { practitionerId, roomId, startTime: at(from), endTime: at(to) }).expect(201);
    return res.body.data._id as string;
  }

  it("rejects moving a slot onto another slot's window", async () => {
    const { token } = await loginAsAdmin();
    const { doctorA, roomA } = await seedSlotFixtures();
    const first = await createOpenSlot(token, doctorA._id.toString(), roomA._id.toString(), 0, 30);
    await createOpenSlot(token, doctorA._id.toString(), roomA._id.toString(), 60, 90);

    await request(app)
      .patch(`/api/slots/${first}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ startTime: at(60), endTime: at(90) })
      .expect(409);
  });

  it("allows moving a slot to a free window, ignoring its own current booking of that time", async () => {
    const { token } = await loginAsAdmin();
    const { doctorA, roomA } = await seedSlotFixtures();
    const id = await createOpenSlot(token, doctorA._id.toString(), roomA._id.toString(), 0, 30);

    // Shifting by 5 minutes overlaps the slot's own existing window — it must not conflict with itself.
    await request(app)
      .patch(`/api/slots/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ startTime: at(5), endTime: at(35) })
      .expect(200);
  });

  it("refuses to edit a slot that a patient has booked", async () => {
    const { token, staffId } = await loginAsAdmin();
    const { doctorA, roomA } = await seedSlotFixtures();
    const slot = await Slot.create({
      practitioner: doctorA._id,
      room: roomA._id,
      start_time: new Date(at(0)),
      end_time: new Date(at(30)),
      status: "BOOKED",
      created_by: staffId,
    });

    const res = await request(app)
      .patch(`/api/slots/${slot._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ startTime: at(120), endTime: at(150) })
      .expect(409);

    expect(res.body.error.message).toMatch(/cancel the appointment/i);
  });

  it("refuses to delete a slot that a patient has booked", async () => {
    const { token, staffId } = await loginAsAdmin();
    const { doctorA, roomA } = await seedSlotFixtures();
    const slot = await Slot.create({
      practitioner: doctorA._id,
      room: roomA._id,
      start_time: new Date(at(0)),
      end_time: new Date(at(30)),
      status: "BOOKED",
      created_by: staffId,
    });

    await request(app).delete(`/api/slots/${slot._id}`).set("Authorization", `Bearer ${token}`).expect(409);
    expect(await Slot.countDocuments()).toBe(1);
  });

  it("deletes an unbooked slot", async () => {
    const { token } = await loginAsAdmin();
    const { doctorA, roomA } = await seedSlotFixtures();
    const id = await createOpenSlot(token, doctorA._id.toString(), roomA._id.toString(), 0, 30);

    await request(app).delete(`/api/slots/${id}`).set("Authorization", `Bearer ${token}`).expect(204);
    expect(await Slot.countDocuments()).toBe(0);
  });
});
