import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import { useListAppointmentsQuery } from "@/features/appointments/appointmentsApi";
import { useGetMyProfileQuery } from "@/features/profile/profileApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { formatDate, formatTime } from "@/lib/dateTime";
import { statusStyle } from "@/lib/statusColor";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeIn, StaggerItem, StaggerList } from "@/components/ui/FadeIn";
import { doctorName, fullName } from "@/lib/personName";
import type { Appointment, Patient } from "@/types/api";

const COMPLETED_LIKE = new Set(["COMPLETED", "BILLED", "CHECKED_OUT", "RECALL_SCHEDULED"]);
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 182;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomePage() {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { data: profile } = useGetMyProfileQuery();
  const { data, isLoading, isError, error } = useListAppointmentsQuery({ limit: 100 });

  const { next, recentVisits, checkupDue } = useMemo(() => {
    const all = data?.data ?? [];
    const now = Date.now();

    const upcoming = all
      .filter((a) => new Date(a.start_time).getTime() >= now && !["CANCELLED", "NO_SHOW"].includes(a.status))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    const past = all
      .filter((a) => COMPLETED_LIKE.has(a.status))
      .sort((a, b) => b.start_time.localeCompare(a.start_time));

    const lastVisitAge = past[0] ? now - new Date(past[0].start_time).getTime() : null;

    return {
      next: upcoming[0] as Appointment | undefined,
      recentVisits: past.slice(0, 3),
      checkupDue: lastVisitAge !== null && lastVisitAge >= SIX_MONTHS_MS,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return <div className="rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">{getApiErrorMessage(error)}</div>;
  }

  return (
    <FadeIn className="space-y-5">
      <div>
        <div className="text-[13px] font-semibold text-faint">{greeting()}</div>
        <div className="font-heading mt-0.5 text-[22px] font-bold text-ink">
          {profile ? fullName(profile.profile as Patient) : user?.email}
        </div>
      </div>

      {/* What's next vs. what's been — two things you glance at separately, so on a wide screen
        * they sit side by side instead of pushing history below the fold. */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
      {next ? (
        <div className="rounded-[22px] bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-[10px_10px_24px_rgba(61,125,191,0.28)]">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold tracking-wide text-white/85 uppercase">Your next appointment</div>
            <div className="text-xs font-bold tracking-wide text-white/85">{next.appointment_code}</div>
          </div>
          <div className="font-heading mt-2 text-lg font-bold">{next.reason.label}</div>
          <div className="mt-1 text-sm text-white/90">
            {formatDate(next.start_time)} · {formatTime(next.start_time)}
          </div>
          <div className="mt-0.5 text-sm text-white/90">with {doctorName(next.practitioner)}</div>
          <div className="mt-4 flex gap-2.5">
            <Button variant="whiteOutline" className="flex-1" onClick={() => navigate(`/patient/appointments/${next._id}`)}>
              View details
            </Button>
            <Button variant="white" className="flex-1" onClick={() => navigate(`/patient/appointments/${next._id}`)}>
              Manage
            </Button>
          </div>
        </div>
      ) : (
        <Card className="text-center">
          <div className="text-sm text-faint">You have no upcoming appointments.</div>
        </Card>
      )}

      <button
        onClick={() => navigate("/patient/book")}
        className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-br from-accent to-accent-dark px-6 py-5 text-left shadow-[10px_10px_22px_rgba(91,110,225,0.3)] transition-transform hover:-translate-y-0.5"
      >
        <div>
          <div className="font-heading text-base font-bold text-white">Book an appointment</div>
          <div className="mt-0.5 text-[13px] text-white/85">Find a time that suits you</div>
        </div>
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {checkupDue && (
        <div className="flex items-center gap-3.5 rounded-2xl bg-teal-tint px-5 py-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-teal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2v6M12 22v-6M4.9 4.9l4.2 4.2M14.9 14.9l4.2 4.2M2 12h6M16 12h6M4.9 19.1l4.2-4.2M14.9 9.1l4.2-4.2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="text-[13.5px] font-bold text-[#1E5C52]">6-month check-up due</div>
            <div className="mt-0.5 text-xs text-[#3E7A70]">It's time to book your next clean</div>
          </div>
        </div>
      )}
        </div>

      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <div className="font-heading text-base font-bold text-ink">Recent visits</div>
          <button onClick={() => navigate("/patient/appointments")} className="text-[13px] font-bold text-primary">
            See all
          </button>
        </div>
        {recentVisits.length === 0 ? (
          <Card className="text-center text-sm text-faint">No past visits yet.</Card>
        ) : (
          <StaggerList className="flex flex-col gap-2.5">
            {recentVisits.map((visit) => {
              const style = statusStyle(visit.status);
              return (
                <StaggerItem key={visit._id}>
                  <button
                    onClick={() => navigate(`/patient/appointments/${visit._id}`)}
                    className="flex w-full items-center justify-between rounded-2xl bg-surface px-5 py-3.5 text-left shadow-[4px_4px_12px_rgba(163,184,204,0.15)]"
                  >
                    <div>
                      <div className="text-sm font-bold text-ink">{visit.reason.label}</div>
                      <div className="mt-0.5 text-xs text-faint">
                        {formatDate(visit.start_time)} · {doctorName(visit.practitioner)}
                      </div>
                    </div>
                    <Pill bg={style.bg} color="#fff">
                      {style.label}
                    </Pill>
                  </button>
                </StaggerItem>
              );
            })}
          </StaggerList>
        )}
      </div>
      </div>
    </FadeIn>
  );
}
