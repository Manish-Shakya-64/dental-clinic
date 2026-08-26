import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  DATA_ENCRYPTION_KEY: z.string().min(1, "DATA_ENCRYPTION_KEY is required"),
  BLIND_INDEX_SECRET: z.string().min(1, "BLIND_INDEX_SECRET is required"),

  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().default(30),

  // The deployed frontend's origin — used to build links that go out in emails (password reset,
  // etc.) so they never point at a placeholder/example domain regardless of environment.
  FRONTEND_URL: z.string().default("http://localhost:5173"),

  EMAIL_PROVIDER: z.string().default("smtp"),
  EMAIL_FROM: z.string().default("Dental Clinic <no-reply@example.com>"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),

  SMS_PROVIDER: z.string().default("twilio"),
  TWILIO_ACCOUNT_SID: z.string().optional().default(""),
  TWILIO_AUTH_TOKEN: z.string().optional().default(""),
  TWILIO_FROM_NUMBER: z.string().optional().default(""),

  REMINDER_HOURS_BEFORE: z.coerce.number().default(48),
  RECALL_MONTHS_AFTER_VISIT: z.coerce.number().default(6),
  /** How long after an appointment's end time to wait before treating a patient who was never
   *  checked in as a no-show. Long enough that reception has had a fair chance to record a late
   *  arrival, short enough that the slot doesn't stay blocked for days. */
  NO_SHOW_GRACE_HOURS: z.coerce.number().default(6),
  /** How long an emailed waitlist offer stays claimable. Capped at the slot's own start time by
   *  the service, so an offer can never outlive the appointment it is for. */
  WAITLIST_OFFER_TTL_HOURS: z.coerce.number().default(12),
  /** How many of the longest-waiting matches get emailed when a slot frees up. First to accept
   *  wins; the rest are told it went and stay on the list. */
  WAITLIST_OFFER_MAX_RECIPIENTS: z.coerce.number().int().min(1).default(3),
  SLOT_LOCK_TTL_MINUTES: z.coerce.number().default(10),

  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().default(15),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (Buffer.from(parsed.data.DATA_ENCRYPTION_KEY, "base64").length !== 32) {
  console.error("DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  process.exit(1);
}

export const env = parsed.data;
