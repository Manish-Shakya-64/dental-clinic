import { Appointment } from "../models/Appointment.js";
import { Patient } from "../models/Patient.js";
import { Practitioner } from "../models/Practitioner.js";
import { Room } from "../models/Room.js";
import { Treatment } from "../models/Treatment.js";
import { sendReminder } from "../services/reminderService.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const JOB_INTERVAL_MINUTES = 15;

/** Reminds not-yet-reminded appointments entering the REMINDER_HOURS_BEFORE window since this job last ran. */
export async function runReminderJob(): Promise<void> {
  const windowStart = new Date(Date.now() + env.REMINDER_HOURS_BEFORE * 60 * 60_000);
  const windowEnd = new Date(windowStart.getTime() + JOB_INTERVAL_MINUTES * 60_000);

  const dueAppointments = await Appointment.find({
    // RECONFIRMED included deliberately: rescheduling moves an appointment out of CONFIRMED, so
    // filtering on CONFIRMED alone meant anything rescheduled into the reminder window was
    // silently skipped and the patient never heard from us.
    status: { $in: ["CONFIRMED", "RECONFIRMED"] },
    start_time: { $gte: windowStart, $lt: windowEnd },
  });

  logger.info({ count: dueAppointments.length }, "[reminderJob] run");

  for (const appointment of dueAppointments) {
    try {
      const [patient, practitioner, room, treatment] = await Promise.all([
        Patient.findById(appointment.patient),
        Practitioner.findById(appointment.practitioner),
        Room.findById(appointment.room),
        Treatment.findById(appointment.reason),
      ]);
      if (!patient || !practitioner || !room || !treatment) {
        logger.warn({ appointmentId: appointment._id.toString() }, "[reminderJob] related record not found, skipping");
        continue;
      }

      await sendReminder({ appointment, patient, practitioner, room, treatment });
      appointment.status = "REMINDED";
      await appointment.save();
    } catch (err) {
      logger.error({ err, appointmentId: appointment._id.toString() }, "[reminderJob] failed to send reminder");
    }
  }
}
