import { Outlet, useLocation } from "react-router-dom";
import { CalendarDays, User, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/Sidebar";

const NAV_ITEMS: NavItem[] = [
  { label: "Calendar", to: "/doctor", end: true, icon: CalendarDays },
  { label: "Patients", to: "/doctor/patients", icon: Users },
  { label: "Profile", to: "/doctor/profile", icon: User },
];

const TITLES: Record<string, string> = {
  "/doctor": "Calendar",
  "/doctor/patients": "My patients",
  "/doctor/profile": "My profile",
};

export function DoctorLayout() {
  const location = useLocation();
  const title = location.pathname.startsWith("/doctor/consultation") ? "Consultation" : (TITLES[location.pathname] ?? "Bright Smile");

  return (
    <AppShell navItems={NAV_ITEMS} title={title}>
      <Outlet />
    </AppShell>
  );
}
