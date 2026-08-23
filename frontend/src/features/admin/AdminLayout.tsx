import { Outlet, useLocation } from "react-router-dom";
import { Clock, DoorOpen, LayoutDashboard, Stethoscope, User, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/Sidebar";

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/admin", end: true, icon: LayoutDashboard },
  { label: "Staff", to: "/admin/staff", icon: Users },
  { label: "Rooms", to: "/admin/rooms", icon: DoorOpen },
  { label: "Slots", to: "/admin/slots", icon: Clock },
  { label: "Treatments", to: "/admin/treatments", icon: Stethoscope },
  { label: "Profile", to: "/admin/profile", icon: User },
];

const TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/staff": "Staff",
  "/admin/rooms": "Rooms",
  "/admin/slots": "Slot management",
  "/admin/treatments": "Treatments & fee schedule",
  "/admin/profile": "My profile",
};

export function AdminLayout() {
  const location = useLocation();
  const title = location.pathname.startsWith("/admin/staff/") ? "Staff" : (TITLES[location.pathname] ?? "Bright Smile");
  return (
    <AppShell navItems={NAV_ITEMS} title={title}>
      <Outlet />
    </AppShell>
  );
}
