import { Appointment, AppointmentStatus } from "../models/Appointment.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/** Statuses meaning "booked, but the patient was never checked in". Anything further along the
 *  flow is deliberately excluded: WAITING means the patient did arrive, so closing that as a
 *  no-show would be a false record — those need a human to finish or correct the visit. */
const NEVER_ARRIVED: AppointmentStatus[] = ["CONFIRMED", "REMINDED", "RECONFIRMED"];

/** Closes out appointments whose time has passed with nobody ever checking the patient in.
 *
 *  Without this, status only ever changed because a human clicked something, so a patient who
 *  simply didn't turn up left the appointment sitting at CONFIRMED indefinitely. That was wrong
 *  twice over: the record claimed a visit was still coming, and because CONFIRMED is a blocking
 *  status it held its (practitioner, room, start_time) slot forever, so that time could never be
 *  rebooked. NO_SHOW is non-blocking, so sweeping also releases the slot. */
export async function runNoShowSweepJob(): Promise<void> {
  const cutoff = new Date(Date.now() - env.NO_SHOW_GRACE_HOURS * 60 * 60_000);

  const lapsed = await Appointment.find({
    status: { $in: NEVER_ARRIVED },
    end_time: { $lt: cutoff },
  });

  if (lapsed.length === 0) {
    logger.info({ count: 0 }, "[noShowSweepJob] run");
    return;
  }

  let swept = 0;
  for (const appointment of lapsed) {
    try {
      const previousStatus = appointment.status;
      appointment.status = "NO_SHOW";
      // Saved one at a time rather than via updateMany so the pre('save') hook recalculates
      // is_blocking_slot — that flag is what actually frees the slot for rebooking.
      await appointment.save();
      swept++;
      logger.info(
        { appointmentId: appointment._id.toString(), code: appointment.appointment_code, from: previousStatus },
        "[noShowSweepJob] marked no-show",
      );
    } catch (err) {
      logger.error({ err, appointmentId: appointment._id.toString() }, "[noShowSweepJob] failed to sweep appointment");
    }
  }

  logger.info({ count: swept, graceHours: env.NO_SHOW_GRACE_HOURS }, "[noShowSweepJob] run");
}
