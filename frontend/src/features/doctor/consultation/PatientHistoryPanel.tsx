import { useMemo } from "react";
import { useListAppointmentsQuery } from "@/features/appointments/appointmentsApi";
import { formatDate } from "@/lib/dateTime";
import { Card } from "@/components/ui/Card";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { StaggerItem, StaggerList } from "@/components/ui/FadeIn";

export function PatientHistoryPanel({ patientId, excludeAppointmentId }: { patientId: string; excludeAppointmentId: string }) {
  const { data, isLoading } = useListAppointmentsQuery({ patient: patientId, limit: 50 });

  const history = useMemo(
    () => (data ? data.data.filter((a) => a._id !== excludeAppointmentId && a.clinical_note?.note_text) : []),
    [data, excludeAppointmentId],
  );

  if (isLoading) return <SkeletonRows count={3} rowClassName="h-24" />;

  if (history.length === 0) {
    return <div className="rounded-2xl bg-surface px-5 py-8 text-center text-sm text-faint">No prior visit notes on file.</div>;
  }

  return (
    <StaggerList className="flex flex-col gap-3">
      {history.map((appt) => (
        <StaggerItem key={appt._id}>
          <Card>
            <div className="text-[13.5px] font-bold text-ink">{appt.reason.label}</div>
            <div className="mt-1 text-xs text-placeholder">{formatDate(appt.start_time)}</div>
            <div className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{appt.clinical_note?.note_text}</div>
          </Card>
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
