export type Role = "PATIENT" | "RECEPTIONIST" | "ADMIN" | "DOCTOR";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export interface PersonName {
  first_name: string;
  middle_name?: string;
  last_name?: string;
}

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface WorkingHoursBlock {
  start: string;
  end: string;
}

export type WorkingHours = Partial<Record<Weekday, WorkingHoursBlock[]>>;

export interface Practitioner extends PersonName {
  _id: string;
  gender: Gender;
  email?: string;
  phone?: string;
  specialties: string[];
  working_hours: WorkingHours;
  is_active: boolean;
  profile_image?: string | null;
}

export interface Patient extends PersonName {
  _id: string;
  gender: Gender;
  dob: string;
  phone: string;
  email: string;
  address?: string;
  medical_history?: string;
  profile_image?: string | null;
}

export interface Treatment {
  _id: string;
  label: string;
  default_duration_mins: number;
  buffer_after_mins: number;
  price: number;
  is_active: boolean;
}

export type RoomStatus = "AVAILABLE" | "SANITIZING" | "OCCUPIED";

export interface Room {
  _id: string;
  name: string;
  equipment_tags: string[];
  status: RoomStatus;
}

export type SlotStatus = "OPEN" | "BOOKED" | "BLOCKED";

export interface Slot {
  _id: string;
  practitioner: Practitioner;
  room: Room;
  start_time: string;
  end_time: string;
  status: SlotStatus;
}

export interface StaffMember extends PersonName {
  _id: string;
  gender: Gender;
  email: string;
  phone?: string;
  role: "RECEPTIONIST" | "ADMIN";
  is_active: boolean;
  profile_image?: string | null;
}

export interface StaffRow extends PersonName {
  id: string;
  /** The Practitioner document id for DOCTOR rows — distinct from `id` (the User id). Required
   *  whenever a doctor is referenced as a Practitioner, e.g. creating/filtering Slots. */
  practitionerId?: string;
  role: Role;
  gender?: Gender;
  email: string;
  phone?: string;
  profile_image?: string | null;
  specialties?: string[];
  working_hours?: WorkingHours;
  is_active: boolean;
}

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
  date: string;
}

export interface DashboardReport {
  range: { from: string; to: string };
  totalAppointments: number;
  cancellations: number;
  noShows: number;
  completedVisits: number;
  slotUtilization: number;
  revenue: number;
  dailySeries: DailyBucket[];
  recentActivity: RecentActivityItem[];
}

export type AppointmentStatus =
  | "DRAFT"
  | "LOCK_EXPIRED"
  | "CONFIRMED"
  | "REMINDED"
  | "RECONFIRMED"
  | "CANCELLED"
  | "CHECKED_IN"
  | "WAITING"
  | "IN_CONSULT"
  | "COMPLETED"
  | "BILLED"
  | "CHECKED_OUT"
  | "RECALL_SCHEDULED"
  | "NO_SHOW";

export interface ClinicalNote {
  note_text: string;
  created_at: string;
}

export interface Medicine {
  name: string;
  dosage: string;
  instructions: string;
}

export interface Appointment {
  _id: string;
  appointment_code: string;
  patient: Patient;
  practitioner: Practitioner;
  room: Room;
  reason: Treatment;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  clinical_note?: ClinicalNote;
  medicines: Medicine[];
  createdAt: string;
  updatedAt: string;
}

export interface Waitlist {
  _id: string;
  patient: Patient;
  reason: Treatment;
  preferred_practitioner?: Practitioner | null;
  preferred_window_start?: string;
  preferred_window_end?: string;
  createdAt: string;
}

export interface Bill {
  _id: string;
  bill_number: string;
  appointment: string;
  patient: string;
  treatment: string;
  amount: number;
  issued_by: string;
  issued_at: string;
  printed_at?: string | null;
  emailed_at?: string | null;
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface ApiEnvelope<T> {
  data: T;
  success: boolean;
}

export interface ApiErrorBody {
  error: { message: string; code: string; fields?: { field: string; message: string }[] };
  success: false;
}
