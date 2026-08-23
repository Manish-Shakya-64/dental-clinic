import twilio from "twilio";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

let client: ReturnType<typeof twilio> | null = null;

const isConfigured = (): boolean => env.TWILIO_ACCOUNT_SID.length > 0;

const getClient = (): ReturnType<typeof twilio> => {
  if (!client) {
    client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
  return client;
};

/** Sends an SMS via Twilio, or logs it instead when Twilio isn't configured (local dev/seed). */
export async function sendSms(to: string, body: string): Promise<void> {
  if (!isConfigured()) {
    logger.info({ to, body }, "[smsService:dev] would send SMS");
    return;
  }

  await getClient().messages.create({ to, from: env.TWILIO_FROM_NUMBER, body });
}
