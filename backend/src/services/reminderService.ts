import { Notification, NotificationType } from "../models/Notification.js";
import { IAppointment } from "../models/Appointment.js";
import { IPatient } from "../models/Patient.js";
import { IPractitioner } from "../models/Practitioner.js";
import { IRoom } from "../models/Room.js";
import { ITreatment } from "../models/Treatment.js";
import { IRecall } from "../models/Recall.js";
import { sendEmail } from "./emailService.js";
import { sendSms } from "./smsService.js";
import { formatFullName } from "../utils/personName.js";
import { buildAppointmentEmail, AppointmentEmailKind } from "./emailTemplates.js";
import { logger } from "../utils/logger.js";

interface NotifyInput {
  appointmentId: string;
  patient: IPatient;
  type: NotificationType;
  subject: string;
  text: string;
  html?: string;
}

/** Sends by email, falling back to SMS if the email send throws, then records a Notification
 *  for whichever channel actually succeeded. */
async function notifyPatient({ appointmentId, patient, type, subject, text, html }: NotifyInput): Promise<void> {
  try {
    await sendEmail({ to: patient.email, subject, text, html });
    await Notification.create({
      appointment: appointmentId,
      channel: "EMAIL",
      type,
      sent_at: new Date(),
    });
    return;
  } catch (err) {
    logger.warn({ err, appointmentId, type }, "Email notification failed, falling back to SMS");
  }

  await sendSms(patient.phone, text);
  await Notification.create({
    appointment: appointmentId,
    channel: "SMS",
    type,
    sent_at: new Date(),
  });
}

/** appointment.practitioner/room/reason must already be populated documents, not bare ObjectIds —
 *  callers fetch (or already have) them for their own logic anyway, so this never re-queries. */
interface AppointmentContext {
  appointment: IAppointment;
  patient: IPatient;
  practitioner: IPractitioner;
  room: IRoom;
  treatment: ITreatment;
  previousStartTime?: Date;
}

const NOTIFICATION_TYPE_BY_KIND: Record<AppointmentEmailKind, NotificationType> = {
  CONFIRMED: "BOOKING_CONFIRMATION",
  RESCHEDULED: "RESCHEDULED",
  CANCELLED: "CANCELLED",
  REMINDER: "REMINDER_48H",
};

async function notifyAppointmentEvent(kind: AppointmentEmailKind, ctx: AppointmentContext): Promise<void> {
  const { subject, text, html } = buildAppointmentEmail(kind, {
    patientName: formatFullName(ctx.patient),
    appointmentCode: ctx.appointment.appointment_code,
    treatmentLabel: ctx.treatment.label,
    doctorName: `Dr. ${formatFullName(ctx.practitioner)}`,
    roomName: ctx.room.name,
    startTime: ctx.appointment.start_time,
    previousStartTime: ctx.previousStartTime,
  });

  await notifyPatient({
    appointmentId: ctx.appointment._id.toString(),
    patient: ctx.patient,
    type: NOTIFICATION_TYPE_BY_KIND[kind],
    subject,
    text,
    html,
  });
}

export async function sendBookingConfirmation(ctx: Omit<AppointmentContext, "previousStartTime">): Promise<void> {
  await notifyAppointmentEvent("CONFIRMED", ctx);
}

export async function sendRescheduleConfirmation(ctx: AppointmentContext): Promise<void> {
  await notifyAppointmentEvent("RESCHEDULED", ctx);
}

export async function sendCancellationConfirmation(ctx: Omit<AppointmentContext, "previousStartTime">): Promise<void> {
  await notifyAppointmentEvent("CANCELLED", ctx);
}

export async function sendReminder(ctx: Omit<AppointmentContext, "previousStartTime">): Promise<void> {
  await notifyAppointmentEvent("REMINDER", ctx);
}

export async function sendRecallReminder(recall: IRecall, patient: IPatient): Promise<void> {
  await notifyPatient({
    appointmentId: recall.original_appointment.toString(),
    patient,
    type: "RECALL",
    subject: "Time for your next dental visit",
    text: `Hi ${formatFullName(patient)},\n\nIt's about time for your follow-up visit (due ${recall.due_date.toLocaleDateString()}). Book online or call us to schedule.\n\n— Bright Smile Dental`,
  });
}
