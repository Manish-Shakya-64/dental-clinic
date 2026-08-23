import cron from "node-cron";
import { runReminderJob } from "./reminderJob.js";
import { runRecallJob } from "./recallJob.js";
import { runLockExpiryJob } from "./lockExpiryJob.js";
import { logger } from "../utils/logger.js";

function safeRun(name: string, fn: () => Promise<void>): () => void {
  return () => {
    fn().catch((err) => logger.error({ err }, `[scheduler] ${name} failed`));
  };
}

export function startScheduler(): void {
  cron.schedule("* * * * *", safeRun("lockExpiryJob", runLockExpiryJob));
  cron.schedule("*/15 * * * *", safeRun("reminderJob", runReminderJob));
  cron.schedule("0 0 * * *", safeRun("recallJob", runRecallJob));

  logger.info("Background job scheduler started");
}
