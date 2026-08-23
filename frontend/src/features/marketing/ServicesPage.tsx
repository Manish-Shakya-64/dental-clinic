import { useNavigate } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import { Button } from "@/components/ui/Button";
import { FadeIn, StaggerItem, StaggerList } from "@/components/ui/FadeIn";
import { roleHomePath } from "@/lib/roleHomePath";
import { SERVICES } from "@/features/marketing/content";

export function ServicesPage() {
  const navigate = useNavigate();
  const { accessToken, user } = useAppSelector((s) => s.auth);

  function handleBook() {
    if (accessToken && user?.role === "PATIENT") navigate("/patient/book");
    else if (accessToken && user) navigate(roleHomePath(user.role));
    else navigate("/signup");
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
      <FadeIn className="text-center">
        <h1 className="font-heading text-3xl font-extrabold text-ink sm:text-4xl">Our services</h1>
        <p className="mx-auto mt-3 max-w-xl text-[15.5px] leading-relaxed text-muted">
          From routine check-ups to same-day emergencies, our team offers comprehensive dental care for every stage of your smile.
        </p>
      </FadeIn>

      <StaggerList className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <StaggerItem key={s.name}>
            <div className="h-full rounded-2xl bg-surface p-7 shadow-[6px_6px_16px_rgba(163,184,204,0.18)]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: s.bg }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d={s.icon} stroke={s.iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="font-heading mt-5 text-lg font-bold text-ink">{s.name}</div>
              <div className="mt-2.5 text-[14px] leading-relaxed text-muted">{s.desc}</div>
              <button onClick={handleBook} className="mt-5 text-[13.5px] font-bold text-primary hover:text-primary-dark">
                Book this service →
              </button>
            </div>
          </StaggerItem>
        ))}
      </StaggerList>

      <div className="mt-16 rounded-[28px] bg-gradient-to-br from-primary to-accent px-8 py-12 text-center sm:px-16">
        <h2 className="font-heading text-xl font-extrabold text-white sm:text-2xl">Not sure which treatment you need?</h2>
        <p className="mt-2.5 text-[14.5px] text-white/85">Book a check-up and we'll help you find the right care.</p>
        <Button variant="white" className="mt-6 px-8 py-3.5" onClick={handleBook}>
          Book an appointment
        </Button>
      </div>
    </div>
  );
}
