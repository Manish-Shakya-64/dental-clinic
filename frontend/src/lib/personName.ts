import type { Gender, PersonName, StaffRow } from "@/types/api";

export function fullName(person: PersonName): string {
  return [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(" ");
}

/** Prefixes "Dr." — for a Practitioner specifically, since the title is a display convention for
 *  the role, not a stored name part. */
export function doctorName(person: PersonName): string {
  return `Dr. ${fullName(person)}`;
}

/** For a StaffRow, which can be a doctor or non-doctor staff member — prefixes "Dr." only for
 *  the doctor case. */
export function staffRowName(row: StaffRow): string {
  return row.role === "DOCTOR" ? doctorName(row) : fullName(row);
}

export function initials(person: PersonName): string {
  const parts = [person.first_name, person.last_name].filter(Boolean) as string[];
  return parts.map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

export function genderLabel(gender: Gender | undefined): string {
  return GENDER_OPTIONS.find((g) => g.value === gender)?.label ?? "—";
}
