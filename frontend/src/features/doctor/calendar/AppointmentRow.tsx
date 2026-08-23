import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { Appointment } from "@/types/api";
import { formatTime } from "@/lib/dateTime";
import { statusStyle } from "@/lib/statusColor";
import { fullName } from "@/lib/personName";
import { Pill } from "@/components/ui/Pill";

export function AppointmentRow({ appointment }: { appointment: Appointment }) {
  const navigate = useNavigate();
  const style = statusStyle(appointment.status);

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={{ x: 2 }}
      onClick={() => navigate(`/doctor/consultation/${appointment._id}`)}
      className="flex cursor-pointer items-center gap-4 rounded-2xl bg-surface px-5 py-3.5 shadow-[4px_4px_12px_rgba(163,184,204,0.15)]"
    >
      <div className="w-20 flex-shrink-0 text-[12.5px] font-bold text-placeholder">{formatTime(appointment.start_time)}</div>
      <div className="h-9 w-1.5 flex-shrink-0 rounded-[3px]" style={{ background: style.bg }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-ink">{fullName(appointment.patient)}</div>
        <div className="mt-0.5 truncate text-xs text-faint">{appointment.reason.label}</div>
      </div>
      <Pill bg={style.bg} color="#fff">
        {style.label}
      </Pill>
    </motion.div>
  );
}
