import { Outlet, useLocation } from "react-router-dom";
import { CalendarDays, Home as HomeIcon, User } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/Sidebar";

const NAV_ITEMS: NavItem[] = [
  { label: "Home", to: "/patient", end: true, icon: HomeIcon },
  { label: "Appointments", to: "/patient/appointments", icon: CalendarDays },
  { label: "Profile", to: "/patient/profile", icon: User },
];

const TITLES: Record<string, string> = {
  "/patient": "Home",
  "/patient/appointments": "Appointments",
  "/patient/book": "Book an appointment",
  "/patient/profile": "My profile",
};

export function PatientLayout() {
  const location = useLocation();
  const title = location.pathname.startsWith("/patient/appointments/") ? "Appointment details" : (TITLES[location.pathname] ?? "Bright Smile");

  return (
    <AppShell navItems={NAV_ITEMS} title={title}>
      <Outlet />
    </AppShell>
  );
}
