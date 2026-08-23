export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export const GENDERS: Gender[] = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"];

export interface PersonNameFields {
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
}
