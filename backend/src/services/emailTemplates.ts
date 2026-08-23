/** Shared HTML email styling — every transactional email (booking, reschedule, cancellation,
 *  reminder, password reset) renders through this shell so they all look like they came from the
 *  same product, not a pile of ad-hoc plain-text notices. Styles are inlined throughout since most
 *  email clients strip <style> blocks. */

function emailShell(innerHtml: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;background:#f5f9fc;padding:32px 16px;">
  <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(163,184,204,0.25);">
    <div style="background:linear-gradient(135deg,#3D7DBF,#5B6EE1);padding:26px 32px;">
      <div style="color:#ffffff;font-size:19px;font-weight:800;letter-spacing:-0.2px;">Bright Smile Dental</div>
    </div>
    <div style="padding:32px;">
      ${innerHtml}
    </div>
    <div style="background:#f5f9fc;padding:16px 32px;font-size:11.5px;color:#9fb2c3;text-align:center;line-height:1.6;">
      Bright Smile Dental · This is an automated message — please don't reply directly to this email.
    </div>
  </div>
</div>`;
}

interface SimpleEmailInput {
  headline: string;
  bodyHtml: string;
  buttonLabel?: string;
  buttonUrl?: string;
  footerHtml?: string;
}

/** For non-appointment emails (password reset, contact form ack, etc). */
export function buildSimpleEmailHtml({ headline, bodyHtml, buttonLabel, buttonUrl, footerHtml }: SimpleEmailInput): string {
  const button =
    buttonLabel && buttonUrl
      ? `<div style="margin:24px 0 4px;"><a href="${buttonUrl}" style="display:inline-block;background:#3D7DBF;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 26px;border-radius:999px;">${buttonLabel}</a></div>`
      : "";
  return emailShell(`
    <div style="font-size:18px;font-weight:800;color:#243b53;margin-bottom:12px;">${headline}</div>
    <div style="font-size:14px;color:#4a6178;line-height:1.6;">${bodyHtml}</div>
    ${button}
    <div style="font-size:12.5px;color:#7c93a8;line-height:1.6;">${footerHtml ?? ""}</div>
  `);
}

export type AppointmentEmailKind = "CONFIRMED" | "RESCHEDULED" | "CANCELLED" | "REMINDER";

export interface AppointmentEmailData {
  patientName: string;
  appointmentCode: string;
  treatmentLabel: string;
  doctorName: string;
  roomName: string;
  startTime: Date;
  previousStartTime?: Date;
}

const KIND_COPY: Record<AppointmentEmailKind, { subjectPrefix: string; headline: string; intro: string; footer: string }> = {
  CONFIRMED: {
    subjectPrefix: "Appointment confirmed",
    headline: "Your appointment is confirmed",
    intro: "Thanks for booking with us — here are your appointment details.",
    footer: "Need to make changes? You can reschedule or cancel anytime from your account, up to 24 hours before your visit without a fee.",
  },
  RESCHEDULED: {
    subjectPrefix: "Appointment rescheduled",
    headline: "Your appointment has been rescheduled",
    intro: "Your appointment time has changed. Please make a note of the new details below.",
    footer: "If this change doesn't work for you, you can reschedule again or cancel from your account.",
  },
  CANCELLED: {
    subjectPrefix: "Appointment cancelled",
    headline: "Your appointment has been cancelled",
    intro: "The appointment below has been cancelled. We're sorry to see it go — you're welcome to book a new time whenever suits you.",
    footer: "If you didn't request this cancellation, please contact us right away.",
  },
  REMINDER: {
    subjectPrefix: "Appointment reminder",
    headline: "Upcoming appointment reminder",
    intro: "This is a friendly reminder about your upcoming appointment.",
    footer: "Please arrive a few minutes early. Need to reschedule or cancel? You can do that from your account.",
  },
};

function formatDateTime(date: Date): { dateStr: string; timeStr: string } {
  const dateStr = date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return { dateStr, timeStr };
}

function detailsRow(label: string, value: string, strikethrough = false): string {
  const valueStyle = strikethrough
    ? "padding:6px 0;font-weight:700;color:#9fb2c3;text-decoration:line-through;"
    : "padding:6px 0;font-weight:700;color:#243b53;";
  return `<tr><td style="padding:6px 0;color:#7c93a8;font-weight:600;width:130px;vertical-align:top;">${label}</td><td style="${valueStyle}">${value}</td></tr>`;
}

export function buildAppointmentEmail(kind: AppointmentEmailKind, data: AppointmentEmailData): { subject: string; text: string; html: string } {
  const copy = KIND_COPY[kind];
  const { dateStr, timeStr } = formatDateTime(data.startTime);
  const subject = `${copy.subjectPrefix} — ${data.appointmentCode}`;

  let previousRow = "";
  let text = `Hi ${data.patientName},\n\n${copy.intro}\n\nAppointment ID: ${data.appointmentCode}\nTreatment: ${data.treatmentLabel}\nDentist: ${data.doctorName}\nDate: ${dateStr}\nTime: ${timeStr}\nRoom: ${data.roomName}\n`;

  if (kind === "RESCHEDULED" && data.previousStartTime) {
    const prev = formatDateTime(data.previousStartTime);
    previousRow = detailsRow("Previously", `${prev.dateStr} · ${prev.timeStr}`, true);
    text += `Previously: ${prev.dateStr} · ${prev.timeStr}\n`;
  }

  text += `\n${copy.footer}\n\n— Bright Smile Dental`;

  const html = emailShell(`
    <div style="font-size:18px;font-weight:800;color:#243b53;margin-bottom:8px;">${copy.headline}</div>
    <p style="font-size:14px;color:#4a6178;line-height:1.6;margin:0 0 22px;">Hi ${data.patientName}, ${copy.intro}</p>
    <div style="background:#f5f9fc;border-radius:12px;padding:18px 22px;">
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        ${detailsRow("Appointment ID", data.appointmentCode)}
        ${detailsRow("Treatment", data.treatmentLabel)}
        ${detailsRow("Dentist", data.doctorName)}
        ${detailsRow("Date", dateStr)}
        ${detailsRow("Time", timeStr)}
        ${detailsRow("Room", data.roomName)}
        ${previousRow}
      </table>
    </div>
    <p style="font-size:12.5px;color:#7c93a8;line-height:1.6;margin:22px 0 0;">${copy.footer}</p>
  `);

  return { subject, text, html };
}
