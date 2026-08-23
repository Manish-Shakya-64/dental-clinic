import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendEmail } from "../services/emailService.js";
import { env } from "../config/env.js";
import { logAudit } from "../middleware/auditLogger.js";

/** Public contact-us form submission — emails the practice's own inbox (EMAIL_FROM) with the
 *  visitor's message. No visitor account required. */
export const submitContact = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phone, message } = req.body;

  await sendEmail({
    to: env.EMAIL_FROM,
    subject: `Website enquiry from ${name}`,
    text: `From: ${name} <${email}>${phone ? `\nPhone: ${phone}` : ""}\n\n${message}`,
  });

  await logAudit({ req, action: "CONTACT_FORM_SUBMITTED", resourceType: "Contact", status: "SUCCESS", actorDisplayName: email });

  res.status(201).json({ data: { message: "Thanks — we'll be in touch shortly." } });
});
