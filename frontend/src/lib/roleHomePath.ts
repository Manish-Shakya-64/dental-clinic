import type { Role } from "@/types/api";

export function roleHomePath(role: Role): string {
  switch (role) {
    case "DOCTOR":
      return "/doctor";
    case "RECEPTIONIST":
      return "/reception";
    case "ADMIN":
      return "/admin";
    case "PATIENT":
      return "/patient";
  }
}
