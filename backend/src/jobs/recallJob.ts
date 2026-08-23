import { Recall } from "../models/Recall.js";
import { Patient } from "../models/Patient.js";
import { sendRecallReminder } from "../services/reminderService.js";
import { logger } from "../utils/logger.js";

/** Sends recall reminders for PENDING Recall records whose due date has arrived. */
export async function runRecallJob(): Promise<void> {
  const dueRecalls = await Recall.find({ status: "PENDING", due_date: { $lte: new Date() } });

  logger.info({ count: dueRecalls.length }, "[recallJob] run");

  for (const recall of dueRecalls) {
    try {
      const patient = await Patient.findById(recall.patient);
      if (!patient) {
        logger.warn({ recallId: recall._id.toString() }, "[recallJob] patient not found, skipping");
        continue;
      }

      await sendRecallReminder(recall, patient);
      recall.status = "REMINDER_SENT";
      await recall.save();
    } catch (err) {
      logger.error({ err, recallId: recall._id.toString() }, "[recallJob] failed to send recall reminder");
    }
  }
}
