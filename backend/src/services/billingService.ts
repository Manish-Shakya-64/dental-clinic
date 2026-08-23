import PDFDocument from "pdfkit";
import { Bill, IBill } from "../models/Bill.js";
import { Appointment, IAppointment } from "../models/Appointment.js";
import { Treatment, ITreatment } from "../models/Treatment.js";
import { Patient, IPatient } from "../models/Patient.js";
import { Recall } from "../models/Recall.js";
import { generateCode } from "../utils/generateCode.js";
import { isDuplicateKeyError, duplicateKeyIsOn } from "../utils/mongoErrors.js";
import { ConflictError, NotFoundError, ValidationError } from "../utils/apiError.js";
import { env } from "../config/env.js";
import { sendEmail } from "./emailService.js";
import { formatFullName } from "../utils/personName.js";

export async function generateBill(appointmentId: string, staffId: string): Promise<IBill> {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new NotFoundError("Appointment not found");

  // The doctor must mark the visit complete (clinical note / treatment actually delivered) before
  // the front desk can bill for it — this also blocks re-billing an appointment that's already
  // past COMPLETED (e.g. already BILLED), since its status has moved on by then.
  if (appointment.status !== "COMPLETED") {
    throw new ConflictError("This appointment can't be billed until the doctor marks it complete");
  }

  const treatment = await Treatment.findById(appointment.reason);
  if (!treatment) throw new NotFoundError("Treatment not found");

  let bill: IBill | undefined;
  const MAX_CODE_COLLISION_RETRIES = 3;
  for (let attempt = 0; attempt <= MAX_CODE_COLLISION_RETRIES; attempt++) {
    try {
      bill = await Bill.create({
        bill_number: generateCode("BILL"),
        appointment: appointmentId,
        patient: appointment.patient,
        // Snapshot the price now — later treatment price changes must not alter this bill.
        treatment: treatment._id,
        amount: treatment.price,
        issued_by: staffId,
        issued_at: new Date(),
      });
      break;
    } catch (err) {
      if (isDuplicateKeyError(err) && duplicateKeyIsOn(err, "bill_number") && attempt < MAX_CODE_COLLISION_RETRIES) {
        continue;
      }
      throw err;
    }
  }
  if (!bill) throw new Error("Unable to generate a unique bill number");

  appointment.status = "BILLED";
  await appointment.save();

  return bill;
}

export async function markPrinted(billId: string): Promise<IBill> {
  const bill = await Bill.findById(billId);
  if (!bill) throw new NotFoundError("Bill not found");
  bill.printed_at = new Date();
  await bill.save();
  return bill;
}

export async function renderBillPdf(bill: IBill, treatment: ITreatment, patient: IPatient): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("Dental Clinic — Bill", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Bill Number: ${bill.bill_number}`);
    doc.text(`Issued: ${bill.issued_at.toLocaleString()}`);
    doc.moveDown();
    doc.text(`Patient: ${formatFullName(patient)}`);
    doc.text(`Treatment: ${treatment.label}`);
    doc.text(`Amount: $${bill.amount.toFixed(2)}`);
    doc.moveDown();
    doc
      .fontSize(10)
      .fillColor("gray")
      .text("This is a fee statement only — no payment has been collected or processed by this system.");
    doc.end();
  });
}

export async function loadBillPdfContext(billId: string): Promise<{ bill: IBill; treatment: ITreatment; patient: IPatient }> {
  const bill = await Bill.findById(billId);
  if (!bill) throw new NotFoundError("Bill not found");

  const [treatment, patient] = await Promise.all([
    Treatment.findById(bill.treatment),
    Patient.findById(bill.patient),
  ]);
  if (!treatment) throw new NotFoundError("Treatment not found");
  if (!patient) throw new NotFoundError("Patient not found");

  return { bill, treatment, patient };
}

/** Shared BILLED -> CHECKED_OUT -> RECALL_SCHEDULED transition, used by both "Complete checkout"
 *  and "Email bill to patient" (emailing completes checkout as a side effect, same as before this
 *  was split out — but each now guards against re-running it on an already-checked-out visit). */
async function completeCheckoutTransition(appointment: IAppointment): Promise<void> {
  appointment.status = "CHECKED_OUT";
  await appointment.save();

  const dueDate = new Date(appointment.start_time);
  dueDate.setMonth(dueDate.getMonth() + env.RECALL_MONTHS_AFTER_VISIT);
  await Recall.create({
    patient: appointment.patient,
    original_appointment: appointment._id,
    due_date: dueDate,
    status: "PENDING",
  });

  appointment.status = "RECALL_SCHEDULED";
  await appointment.save();
}

/** Standalone "Complete checkout" action — lets reception close out a billed visit without
 *  necessarily emailing a receipt. Requires the appointment to still be BILLED. */
export async function completeCheckoutByAppointment(appointmentId: string): Promise<IAppointment> {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new NotFoundError("Appointment not found");
  if (appointment.status !== "BILLED") {
    throw new ValidationError(`Appointment is ${appointment.status}, not ready for checkout`);
  }

  await completeCheckoutTransition(appointment);
  return appointment;
}

/** Emails the bill and, if the visit hasn't already been checked out some other way, completes
 *  checkout: BILLED -> CHECKED_OUT, then auto-schedules a Recall and moves the appointment to
 *  RECALL_SCHEDULED, per the required lifecycle. */
export async function emailBillToPatient(billId: string): Promise<IBill> {
  const { bill, treatment, patient } = await loadBillPdfContext(billId);

  const appointment = await Appointment.findById(bill.appointment);
  if (!appointment) throw new NotFoundError("Appointment not found");

  const pdf = await renderBillPdf(bill, treatment, patient);
  await sendEmail({
    to: patient.email,
    subject: `Your bill ${bill.bill_number}`,
    text: "Please find your bill attached.",
    attachments: [{ filename: `${bill.bill_number}.pdf`, content: pdf, contentType: "application/pdf" }],
  });

  bill.emailed_at = new Date();
  await bill.save();

  if (appointment.status === "BILLED") {
    await completeCheckoutTransition(appointment);
  }

  return bill;
}
