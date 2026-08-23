import bcrypt from "bcrypt";
import { connectDB, closeDB } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { User } from "../src/models/User.js";
import { Patient } from "../src/models/Patient.js";
import { Practitioner } from "../src/models/Practitioner.js";
import { StaffMember } from "../src/models/StaffMember.js";
import { Room } from "../src/models/Room.js";
import { Treatment } from "../src/models/Treatment.js";
import { Slot } from "../src/models/Slot.js";
import { Appointment } from "../src/models/Appointment.js";
import { Bill } from "../src/models/Bill.js";
import { Recall } from "../src/models/Recall.js";
import { Waitlist } from "../src/models/Waitlist.js";
import { Notification } from "../src/models/Notification.js";
import { generateCode } from "../src/utils/generateCode.js";
import { Gender } from "../src/types/person.types.js";

if (env.NODE_ENV === "production") {
  console.error("Refusing to run the seed script against a production environment.");
  process.exit(1);
}

const SEED_PASSWORD = "Password123!";

async function createAccount(
  role: "ADMIN" | "RECEPTIONIST" | "DOCTOR",
  firstName: string,
  lastName: string,
  email: string,
  extra: { specialties?: string[]; phone?: string; gender?: Gender } = {},
) {
  const password_hash = await bcrypt.hash(SEED_PASSWORD, 12);
  const gender = extra.gender ?? "PREFER_NOT_TO_SAY";
  const displayName = role === "DOCTOR" ? `Dr. ${firstName} ${lastName}` : `${firstName} ${lastName}`;

  if (role === "DOCTOR") {
    const practitioner = await Practitioner.create({
      first_name: firstName,
      last_name: lastName,
      gender,
      specialties: extra.specialties ?? ["General Dentistry"],
      working_hours: {
        mon: [{ start: "09:00", end: "17:00" }],
        tue: [{ start: "09:00", end: "17:00" }],
        wed: [{ start: "09:00", end: "17:00" }],
        thu: [{ start: "09:00", end: "17:00" }],
        fri: [{ start: "09:00", end: "15:00" }],
      },
    });
    await User.create({ email, password_hash, role, practitioner: practitioner._id });
    return { role, name: displayName, email, id: practitioner._id.toString() };
  }

  const staff = await StaffMember.create({ first_name: firstName, last_name: lastName, gender, email, phone: extra.phone, role });
  await User.create({ email, password_hash, role, staff: staff._id });
  return { role, name: displayName, email, id: staff._id.toString() };
}

async function main() {
  await connectDB();

  console.log("Clearing existing collections...");
  await Promise.all([
    User.deleteMany({}),
    Patient.deleteMany({}),
    Practitioner.deleteMany({}),
    StaffMember.deleteMany({}),
    Room.deleteMany({}),
    Treatment.deleteMany({}),
    Slot.deleteMany({}),
    Appointment.deleteMany({}),
    Bill.deleteMany({}),
    Recall.deleteMany({}),
    Waitlist.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  console.log("Creating staff accounts...");
  const credentials = [];
  credentials.push(await createAccount("ADMIN", "Ava", "Admin", "admin@dentalclinic.test", { gender: "FEMALE" }));
  credentials.push(
    await createAccount("RECEPTIONIST", "Rita", "Receptionist", "reception1@dentalclinic.test", { phone: "0400111222", gender: "FEMALE" }),
  );
  credentials.push(
    await createAccount("RECEPTIONIST", "Ryan", "Receptionist", "reception2@dentalclinic.test", { phone: "0400111333", gender: "MALE" }),
  );
  const doctor1 = await createAccount("DOCTOR", "Priya", "Sharma", "priya.sharma@dentalclinic.test", {
    specialties: ["General Dentistry", "Orthodontics"],
    gender: "FEMALE",
  });
  const doctor2 = await createAccount("DOCTOR", "James", "Wilson", "james.wilson@dentalclinic.test", {
    specialties: ["Endodontics"],
    gender: "MALE",
  });
  const doctor3 = await createAccount("DOCTOR", "Mei", "Chen", "mei.chen@dentalclinic.test", {
    specialties: ["Periodontics"],
    gender: "FEMALE",
  });
  credentials.push(doctor1, doctor2, doctor3);
  const doctors = [doctor1, doctor2, doctor3];

  console.log("Creating rooms...");
  const room1 = await Room.create({ name: "Room 1", equipment_tags: ["chair", "x-ray"], status: "AVAILABLE" });
  const room2 = await Room.create({ name: "Room 2", equipment_tags: ["chair"], status: "AVAILABLE" });
  const rooms = [room1, room2];

  console.log("Creating treatments...");
  const treatments = await Treatment.insertMany([
    { label: "Check-up & Clean", default_duration_mins: 30, buffer_after_mins: 5, price: 180 },
    { label: "Filling", default_duration_mins: 45, buffer_after_mins: 10, price: 250 },
    { label: "Root Canal", default_duration_mins: 90, buffer_after_mins: 15, price: 1200 },
    { label: "Extraction", default_duration_mins: 45, buffer_after_mins: 10, price: 300 },
    { label: "Teeth Whitening", default_duration_mins: 60, buffer_after_mins: 5, price: 450 },
    { label: "Scale & Polish", default_duration_mins: 30, buffer_after_mins: 5, price: 150 },
  ]);

  console.log("Creating patients...");
  const patientSeeds: { first: string; last: string; phone: string; gender: Gender }[] = [
    { first: "Olivia", last: "Taylor", phone: "0411000001", gender: "FEMALE" },
    { first: "Jack", last: "Anderson", phone: "0411000002", gender: "MALE" },
    { first: "Charlotte", last: "Thomas", phone: "0411000003", gender: "FEMALE" },
    { first: "William", last: "Nguyen", phone: "0411000004", gender: "MALE" },
    { first: "Amelia", last: "Martin", phone: "0411000005", gender: "FEMALE" },
    { first: "Noah", last: "Robinson", phone: "0411000006", gender: "MALE" },
    { first: "Isla", last: "White", phone: "0411000007", gender: "FEMALE" },
    { first: "Lucas", last: "Harris", phone: "0411000008", gender: "MALE" },
    { first: "Mia", last: "Clarke", phone: "0411000009", gender: "FEMALE" },
    { first: "Ethan", last: "Walker", phone: "0411000010", gender: "MALE" },
    { first: "Grace", last: "Young", phone: "0411000011", gender: "FEMALE" },
    { first: "Henry", last: "King", phone: "0411000012", gender: "MALE" },
  ];
  const patients = [];
  for (const [i, p] of patientSeeds.entries()) {
    patients.push(
      await Patient.create({
        first_name: p.first,
        last_name: p.last,
        gender: p.gender,
        email: `${p.first.toLowerCase()}.${p.last.toLowerCase()}@example.test`,
        phone: p.phone,
        dob: new Date(1970 + (i % 40), i % 12, (i % 27) + 1).toISOString().slice(0, 10),
        address: `${10 + i} Example Street, Sydney NSW 2000`,
      }),
    );
  }

  console.log("Creating slots and appointments...");
  const statusByOffset = (offsetDays: number): string => {
    if (offsetDays < -3) return "COMPLETED";
    if (offsetDays < 0) return "CHECKED_OUT";
    if (offsetDays === 0) return "WAITING";
    if (offsetDays <= 3) return "CONFIRMED";
    return "REMINDED";
  };

  const offsets = [-10, -7, -5, -3, -1, 0, 1, 2, 3, 5, 7, 10, 14, -2, 4];
  for (const [i, offsetDays] of offsets.entries()) {
    const doctor = doctors[i % doctors.length];
    const room = rooms[i % rooms.length];
    const treatment = treatments[i % treatments.length];
    const patient = patients[i % patients.length];

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + offsetDays);
    startTime.setHours(9 + (i % 7), 0, 0, 0);
    const endTime = new Date(startTime.getTime() + treatment.default_duration_mins * 60_000);

    let status = statusByOffset(offsetDays);
    if (i === 4) status = "CANCELLED";
    if (i === 8) status = "NO_SHOW";

    const appointment = await Appointment.create({
      appointment_code: generateCode("APT"),
      patient: patient._id,
      practitioner: doctor.id,
      room: room._id,
      reason: treatment._id,
      start_time: startTime,
      end_time: endTime,
      status,
      medicines: status === "COMPLETED" || status === "CHECKED_OUT" ? [{ name: "Amoxicillin", dosage: "500mg", instructions: "Twice daily for 5 days" }] : [],
      clinical_note:
        status === "COMPLETED" || status === "CHECKED_OUT"
          ? { note_text: "Routine visit, no complications.", created_at: startTime }
          : undefined,
    });

    if (status === "CHECKED_OUT") {
      const bill = await Bill.create({
        bill_number: generateCode("BILL"),
        appointment: appointment._id,
        patient: patient._id,
        treatment: treatment._id,
        amount: treatment.price,
        issued_by: credentials[1].id,
        issued_at: startTime,
        printed_at: startTime,
        emailed_at: startTime,
      });
      const dueDate = new Date(startTime);
      dueDate.setMonth(dueDate.getMonth() + env.RECALL_MONTHS_AFTER_VISIT);
      await Recall.create({ patient: patient._id, original_appointment: appointment._id, due_date: dueDate, status: "PENDING" });
      void bill;
    }
  }

  for (const doctor of doctors) {
    for (let i = 1; i <= 4; i++) {
      const startTime = new Date();
      startTime.setDate(startTime.getDate() + i);
      startTime.setHours(13, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 30 * 60_000);
      await Slot.create({
        practitioner: doctor.id,
        room: rooms[i % rooms.length]._id,
        start_time: startTime,
        end_time: endTime,
        status: "OPEN",
        created_by: credentials[1].id,
      });
    }
  }

  console.log("\n=== Seeded login credentials (password for all: " + SEED_PASSWORD + ") ===");
  for (const c of credentials) {
    console.log(`${c.role.padEnd(13)} ${c.email}`);
  }
  console.log("===========================================================\n");

  await closeDB();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await closeDB();
  process.exit(1);
});
