import { Outlet, useLocation } from "react-router-dom";
import { CalendarDays, ListOrdered, User, UserCheck, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/Sidebar";

const NAV_ITEMS: NavItem[] = [
  { label: "Calendar", to: "/reception", end: true, icon: CalendarDays },
  { label: "Check-in", to: "/reception/checkin", icon: UserCheck },
  { label: "Waitlist", to: "/reception/waitlist", icon: ListOrdered },
  { label: "Patients", to: "/reception/patients", icon: Users },
  { label: "Profile", to: "/reception/profile", icon: User },
];

const TITLES: Record<string, string> = {
  "/reception": "Master calendar",
  "/reception/checkin": "Check-in patient",
  "/reception/waitlist": "Waitlist",
  "/reception/patients": "Patients",
  "/reception/profile": "My profile",
};

export function ReceptionistLayout() {
  const location = useLocation();
  const title = location.pathname.startsWith("/reception/checkout")
    ? "Checkout"
    : location.pathname.startsWith("/reception/patients/")
      ? "Patients"
      : (TITLES[location.pathname] ?? "Bright Smile");

  return (
    <AppShell navItems={NAV_ITEMS} title={title}>
      <Outlet />
    </AppShell>
  );
}
