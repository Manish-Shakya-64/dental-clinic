import { Appointment } from "../models/Appointment.js";
import { Slot } from "../models/Slot.js";
import { Bill } from "../models/Bill.js";
import { formatFullName } from "../utils/personName.js";
import { PersonNameFields } from "../types/person.types.js";

export interface DailyBucket {
  date: string;
  bookings: number;
  cancellations: number;
  noShows: number;
}

export interface RecentActivityItem {
  id: string;
  patientName: string;
  type: "CANCELLED" | "NO_SHOW";
  date: Date;
}

export interface DashboardReport {
  range: { from: Date; to: Date };
  totalAppointments: number;
  cancellations: number;
  noShows: number;
  completedVisits: number;
  slotUtilization: number;
  revenue: number;
  dailySeries: DailyBucket[];
  recentActivity: RecentActivityItem[];
}

const COMPLETED_LIKE_STATUSES = ["COMPLETED", "BILLED", "CHECKED_OUT", "RECALL_SCHEDULED"];

interface DailyAggRow {
  _id: string;
  bookings: number;
  cancellations: number;
  noShows: number;
}

async function getDailySeries(from: Date, to: Date): Promise<DailyBucket[]> {
  const rows = await Appointment.aggregate<DailyAggRow>([
    { $match: { start_time: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$start_time" } },
        bookings: { $sum: 1 },
        cancellations: { $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] } },
        noShows: { $sum: { $cond: [{ $eq: ["$status", "NO_SHOW"] }, 1, 0] } },
      },
    },
  ]);
  const byDate = new Map(rows.map((r) => [r._id, r]));

  const days: DailyBucket[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const row = byDate.get(key);
    days.push({ date: key, bookings: row?.bookings ?? 0, cancellations: row?.cancellations ?? 0, noShows: row?.noShows ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

async function getRecentActivity(limit = 8): Promise<RecentActivityItem[]> {
  const appointments = await Appointment.find({ status: { $in: ["CANCELLED", "NO_SHOW"] } })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate("patient");

  return appointments.map((a) => ({
    id: a._id.toString(),
    patientName: formatFullName(a.patient as unknown as PersonNameFields),
    type: a.status as "CANCELLED" | "NO_SHOW",
    date: a.updatedAt,
  }));
}

export async function getDashboard(from: Date, to: Date): Promise<DashboardReport> {
  const appointmentWindow = { start_time: { $gte: from, $lte: to } };

  const [
    totalAppointments,
    cancellations,
    noShows,
    completedVisits,
    revenueAgg,
    totalSlots,
    bookedSlots,
    dailySeries,
    recentActivity,
  ] = await Promise.all([
    Appointment.countDocuments(appointmentWindow),
    Appointment.countDocuments({ ...appointmentWindow, status: "CANCELLED" }),
    Appointment.countDocuments({ ...appointmentWindow, status: "NO_SHOW" }),
    Appointment.countDocuments({ ...appointmentWindow, status: { $in: COMPLETED_LIKE_STATUSES } }),
    Bill.aggregate<{ _id: null; total: number }>([
      { $match: { issued_at: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Slot.countDocuments({ start_time: { $gte: from, $lte: to } }),
    Slot.countDocuments({ start_time: { $gte: from, $lte: to }, status: "BOOKED" }),
    getDailySeries(from, to),
    getRecentActivity(),
  ]);

  return {
    range: { from, to },
    totalAppointments,
    cancellations,
    noShows,
    completedVisits,
    slotUtilization: totalSlots > 0 ? bookedSlots / totalSlots : 0,
    revenue: revenueAgg[0]?.total ?? 0,
    dailySeries,
    recentActivity,
  };
}
