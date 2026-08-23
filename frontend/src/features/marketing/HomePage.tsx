import { Link, useNavigate } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import { useListDoctorsQuery } from "@/features/doctors/doctorsApi";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Marquee } from "@/components/ui/Marquee";
import { FadeIn, StaggerItem, StaggerList } from "@/components/ui/FadeIn";
import { roleHomePath } from "@/lib/roleHomePath";
import { STATS, SERVICES, WHY_US, TESTIMONIALS } from "@/features/marketing/content";
import { DoctorCard } from "@/features/marketing/DoctorCard";
import heroImage from "@/assets/hero.webp";

const DOCTOR_MARQUEE_THRESHOLD = 5;

export function HomePage() {
  const navigate = useNavigate();
  const { accessToken, user } = useAppSelector((s) => s.auth);
  const { data: doctors, isLoading: doctorsLoading } = useListDoctorsQuery();

  function handleBook() {
    if (accessToken && user?.role === "PATIENT") navigate("/patient/book");
    else if (accessToken && user) navigate(roleHomePath(user.role));
    else navigate("/signup");
  }

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col-reverse items-center gap-10 px-5 py-14 sm:px-8 lg:flex-row lg:gap-16 lg:py-24">
        <FadeIn className="flex-1 text-center lg:text-left">
          <h1 className="font-heading text-4xl leading-tight font-extrabold text-ink sm:text-5xl">
            Modern dental care,
            <br />
            made simple
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[16px] leading-relaxed text-ink-soft lg:mx-0">
            Friendly, gentle dentistry with flexible booking, transparent pricing, and a team that actually listens.
          </p>
          <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:justify-center lg:justify-start">
            <Button onClick={handleBook} className="px-8 py-4 text-[15px]">
              Book an appointment
            </Button>
            <Button variant="outline" className="px-8 py-4 text-[15px]" onClick={() => navigate("/services")}>
              Our services
            </Button>
          </div>
        </FadeIn>

        <FadeIn delay={0.1} className="relative w-full flex-1">
          <img
            src={heroImage}
            alt="Bright Smile Dental clinic"
            className="h-64 w-full rounded-[28px] object-cover shadow-[10px_10px_26px_rgba(163,184,204,0.35)] sm:h-80 lg:h-[420px]"
          />
          <div className="absolute -bottom-6 left-4 rounded-2xl bg-surface px-5 py-4 shadow-[10px_10px_26px_rgba(163,184,204,0.35)] sm:left-0">
            <div className="text-[11.5px] font-bold tracking-wide text-placeholder uppercase">Next available</div>
            <div className="font-heading mt-1.5 text-[15px] font-bold text-ink">Tomorrow, 9:30 AM</div>
            <div className="mt-0.5 text-xs text-faint">with our next available dentist</div>
          </div>
        </FadeIn>
      </section>

      {/* Stats */}
      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 py-14 sm:px-8 md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-2xl bg-surface px-4 py-6 text-center shadow-[6px_6px_16px_rgba(163,184,204,0.18)]">
            <div className="font-heading text-2xl font-extrabold text-primary sm:text-3xl">{s.value}</div>
            <div className="mt-1.5 text-[12.5px] font-semibold text-muted">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Services preview */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <h2 className="font-heading text-center text-2xl font-extrabold text-ink sm:text-3xl">Our services</h2>
        <p className="mt-2.5 text-center text-[15px] text-muted">Comprehensive care for every stage of your smile</p>
        <StaggerList className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <StaggerItem key={s.name}>
              <div className="h-full rounded-2xl bg-surface p-6 shadow-[6px_6px_16px_rgba(163,184,204,0.18)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: s.bg }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d={s.icon} stroke={s.iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="font-heading mt-4 text-[16.5px] font-bold text-ink">{s.name}</div>
                <div className="mt-2 text-[13.5px] leading-relaxed text-muted">{s.desc}</div>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
        <div className="mt-8 text-center">
          <Link to="/services" className="text-[14px] font-bold text-primary">
            View all services →
          </Link>
        </div>
      </section>

      {/* Dentists */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <h2 className="font-heading text-center text-2xl font-extrabold text-ink sm:text-3xl">Meet our dentists</h2>
        {doctorsLoading ? (
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
          <div className="mt-10 flex flex-wrap justify-center gap-5">
            {(doctors ?? []).map((d) => (
              <DoctorCard key={d._id} doctor={d} />
            ))}
          </div>
        )}
      </section>

      {/* Why us */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 py-14 sm:px-8 md:grid-cols-3">
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
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <h2 className="font-heading text-center text-2xl font-extrabold text-ink sm:text-3xl">What patients say</h2>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl bg-surface p-6 shadow-[6px_6px_16px_rgba(163,184,204,0.18)]">
              <div className="text-[15px] tracking-wide text-amber">★★★★★</div>
              <div className="mt-3.5 text-[14px] leading-relaxed text-ink-soft italic">"{t.quote}"</div>
              <div className="mt-4 text-[13px] font-bold text-ink">— {t.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        <div className="rounded-[28px] bg-gradient-to-br from-primary to-accent px-8 py-14 text-center sm:px-16">
          <h2 className="font-heading text-2xl font-extrabold text-white sm:text-3xl">Ready to feel good about your smile again?</h2>
          <Button variant="white" className="mt-7 px-9 py-4 text-[15.5px]" onClick={handleBook}>
            Book your appointment
          </Button>
        </div>
      </section>
    </div>
  );
}
