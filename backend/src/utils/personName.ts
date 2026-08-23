import { PersonNameFields } from "../types/person.types.js";

/** Joins the three name parts for contexts that need one display string (emails, PDFs, audit
 *  trails, activity feeds) — structured API responses should send the parts and let the client
 *  format them instead of calling this. */
export function formatFullName(person: PersonNameFields): string {
  return [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(" ");
}
