import { DoctorAvatar } from "@/components/ui/DoctorAvatar";
import { doctorName } from "@/lib/personName";
import type { DoctorSummary } from "@/features/doctors/doctorsApi";

export function DoctorCard({ doctor }: { doctor: DoctorSummary }) {
  return (
    <div className="w-40 flex-none rounded-2xl bg-surface p-6 text-center shadow-[6px_6px_16px_rgba(163,184,204,0.18)] sm:w-52">
      <DoctorAvatar doctor={doctor} className="mx-auto mb-4 h-20 w-20 text-lg" />
      <div className="font-heading text-[15px] font-bold text-ink">{doctorName(doctor)}</div>
      <div className="mt-1 text-[12px] text-faint">{doctor.specialties.join(", ") || "General Dentistry"}</div>
    </div>
  );
}
