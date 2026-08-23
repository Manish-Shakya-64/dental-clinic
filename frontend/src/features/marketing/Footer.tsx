import { Link } from "react-router-dom";
import { CLINIC } from "@/features/marketing/content";

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8 md:flex-row md:justify-between">
        <div>
          <div className="font-heading text-lg font-extrabold text-ink">{CLINIC.name}</div>
          <div className="mt-2.5 text-[13px] leading-relaxed text-muted">
            {CLINIC.address}
            <br />
            {CLINIC.hours}
            <br />
            {CLINIC.phone}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="font-heading mb-1 text-[13px] font-bold text-ink">Quick links</div>
          <Link to="/services" className="text-[13.5px] text-muted hover:text-primary">
            Services
          </Link>
          <Link to="/about" className="text-[13.5px] text-muted hover:text-primary">
            About
          </Link>
          <Link to="/contact" className="text-[13.5px] text-muted hover:text-primary">
            Contact
          </Link>
          <Link to="/login" className="text-[13.5px] text-muted hover:text-primary">
            Patient login
          </Link>
        </div>

        <div className="flex gap-3 md:self-start">
          {["FB", "IG", "X"].map((label) => (
            <div
              key={label}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-tint text-[10px] font-bold text-primary"
              aria-hidden
            >
              {label}
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border/60 px-5 py-5 text-center text-xs text-placeholder sm:px-8">
        © {new Date().getFullYear()} {CLINIC.name}. All rights reserved.
      </div>
    </footer>
  );
}
