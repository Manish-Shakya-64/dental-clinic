export type Role = "PATIENT" | "RECEPTIONIST" | "ADMIN" | "DOCTOR";

export const ROLES: Role[] = ["PATIENT", "RECEPTIONIST", "ADMIN", "DOCTOR"];

export interface JWTAccessPayload {
  sub: string;
  role: Role;
  patientId?: string;
  staffId?: string;
  practitionerId?: string;
}

export interface JWTRefreshPayload {
  sub: string;
  tokenVersion: number;
}

/** Minimal, request-scoped user context attached by authenticate.ts. */
export interface RequestUser {
  userId: string;
  role: Role;
  patientId?: string;
  staffId?: string;
  practitionerId?: string;
}
