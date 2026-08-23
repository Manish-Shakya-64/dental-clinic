import { Outlet, useLocation } from "react-router-dom";
import { CalendarDays, Clock, DoorOpen, LayoutDashboard, Stethoscope, User, UserRound, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/Sidebar";

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/admin", end: true, icon: LayoutDashboard },
  { label: "Staff", to: "/admin/staff", icon: Users },
  { label: "Patients", to: "/admin/patients", icon: UserRound },
  { label: "Appointments", to: "/admin/appointments", icon: CalendarDays },
  { label: "Rooms", to: "/admin/rooms", icon: DoorOpen },
  { label: "Slots", to: "/admin/slots", icon: Clock },
  { label: "Treatments", to: "/admin/treatments", icon: Stethoscope },
  { label: "Profile", to: "/admin/profile", icon: User },
];

const TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/staff": "Staff",
  "/admin/patients": "Patients",
  "/admin/appointments": "Appointments",
  "/admin/rooms": "Rooms",
  "/admin/slots": "Slot management",
  "/admin/treatments": "Treatments & fee schedule",
  "/admin/profile": "My profile",
};

/** Section titles for nested routes, matched by path prefix so detail/edit screens keep their
 *  parent section's heading instead of falling through to the app name. */
const NESTED_TITLES: [prefix: string, title: string][] = [
  ["/admin/staff/", "Staff"],
  ["/admin/patients/", "Patients"],
  ["/admin/appointments/", "Appointments"],
];

export function AdminLayout() {
  const location = useLocation();
  const nested = NESTED_TITLES.find(([prefix]) => location.pathname.startsWith(prefix));
  const title = nested ? nested[1] : (TITLES[location.pathname] ?? "Bright Smile");
  return (
    <AppShell navItems={NAV_ITEMS} title={title}>
      <Outlet />
    </AppShell>
  );
}
