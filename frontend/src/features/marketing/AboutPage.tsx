import { useListDoctorsQuery } from "@/features/doctors/doctorsApi";
import { Skeleton } from "@/components/ui/Skeleton";
import { Marquee } from "@/components/ui/Marquee";
import { FadeIn, StaggerItem, StaggerList } from "@/components/ui/FadeIn";
import { STATS, WHY_US } from "@/features/marketing/content";
import { DoctorCard } from "@/features/marketing/DoctorCard";

const DOCTOR_MARQUEE_THRESHOLD = 5;

export function AboutPage() {
  const { data: doctors, isLoading } = useListDoctorsQuery();

  return (
    <div>
      <section className="mx-auto max-w-4xl px-5 py-14 text-center sm:px-8 lg:py-20">
        <FadeIn>
          <h1 className="font-heading text-3xl font-extrabold text-ink sm:text-4xl">Dentistry that puts people first</h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15.5px] leading-relaxed text-ink-soft">
            Bright Smile Dental was founded on a simple idea: going to the dentist shouldn't be stressful. For over 15 years
            we've combined modern technique with genuine care, so every visit — from a routine clean to an emergency
            appointment — feels calm, transparent, and handled by people who actually listen.
          </p>
        </FadeIn>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 pb-14 sm:px-8 md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-2xl bg-surface px-4 py-6 text-center shadow-[6px_6px_16px_rgba(163,184,204,0.18)]">
            <div className="font-heading text-2xl font-extrabold text-primary sm:text-3xl">{s.value}</div>
            <div className="mt-1.5 text-[12.5px] font-semibold text-muted">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <h2 className="font-heading text-center text-2xl font-extrabold text-ink sm:text-3xl">What we believe in</h2>
        <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3">
          {WHY_US.map((w) => (
            <div key={w.title} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-tint">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d={w.icon} stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="font-heading mt-4 text-[16px] font-bold text-ink">{w.title}</div>
              <div className="mt-2 text-[13.5px] leading-relaxed text-muted">{w.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <h2 className="font-heading text-center text-2xl font-extrabold text-ink sm:text-3xl">Meet the team</h2>
        <p className="mt-2.5 text-center text-[15px] text-muted">Experienced, friendly, and genuinely invested in your care</p>
        {isLoading ? (
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : (doctors ?? []).length > DOCTOR_MARQUEE_THRESHOLD ? (
          <Marquee className="mt-10">
            {(doctors ?? []).map((d) => (
              <DoctorCard key={d._id} doctor={d} />
            ))}
          </Marquee>
        ) : (
          <StaggerList className="mt-10 flex flex-wrap justify-center gap-5">
            {(doctors ?? []).map((d) => (
              <StaggerItem key={d._id}>
                <DoctorCard doctor={d} />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </section>
    </div>
  );
}
