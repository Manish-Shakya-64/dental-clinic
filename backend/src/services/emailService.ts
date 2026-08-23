import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}

let transporter: Transporter | null = null;

const isConfigured = (): boolean => env.SMTP_HOST.length > 0;

const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
};

/** Sends an email via SMTP, or logs it instead when SMTP_HOST isn't configured (local dev/seed). */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!isConfigured()) {
    logger.info({ to: input.to, subject: input.subject }, "[emailService:dev] would send email");
    return;
  }

  await getTransporter().sendMail({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    attachments: input.attachments,
  });
}
