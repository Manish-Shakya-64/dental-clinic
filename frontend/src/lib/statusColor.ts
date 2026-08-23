import type { AppointmentStatus } from "@/types/api";

interface StatusStyle {
  label: string;
  color: string;
  bg: string;
}

const STATUS_STYLES: Record<AppointmentStatus, StatusStyle> = {
  DRAFT: { label: "Draft", color: "#6B8098", bg: "#EEF2F6" },
  LOCK_EXPIRED: { label: "Expired", color: "#6B8098", bg: "#EEF2F6" },
  CONFIRMED: { label: "Confirmed", color: "#3D7DBF", bg: "#3D7DBF" },
  REMINDED: { label: "Reminded", color: "#3D7DBF", bg: "#3D7DBF" },
  RECONFIRMED: { label: "Reconfirmed", color: "#3D7DBF", bg: "#3D7DBF" },
  CANCELLED: { label: "Cancelled", color: "#D9765F", bg: "#D9765F" },
  CHECKED_IN: { label: "Checked in", color: "#F5C177", bg: "#F5C177" },
  WAITING: { label: "Waiting", color: "#F5C177", bg: "#F5C177" },
  IN_CONSULT: { label: "In Consult", color: "#5B6EE1", bg: "#5B6EE1" },
  COMPLETED: { label: "Completed", color: "#5DC1B9", bg: "#5DC1B9" },
  BILLED: { label: "Billed", color: "#5DC1B9", bg: "#5DC1B9" },
  CHECKED_OUT: { label: "Checked out", color: "#2E7A6C", bg: "#2E7A6C" },
  RECALL_SCHEDULED: { label: "Recall scheduled", color: "#8A6212", bg: "#8A6212" },
  NO_SHOW: { label: "No-show", color: "#D9765F", bg: "#D9765F" },
};

export function statusStyle(status: AppointmentStatus): StatusStyle {
  return STATUS_STYLES[status];
}
