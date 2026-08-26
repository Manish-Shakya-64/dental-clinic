import { Link } from "react-router-dom";
import { CLINIC } from "@/features/marketing/content";
import type { SocialPlatform } from "@/features/marketing/content";
import { Logo } from "@/components/ui/Logo";
import { FacebookIcon, InstagramIcon, XIcon } from "@/components/ui/SocialIcons";

/** Maps CLINIC.socials[].platform to its glyph. Kept here rather than alongside the icons so that
 *  file exports only components, which is what React Fast Refresh needs to hot-reload it. */
const SOCIAL_ICONS: Record<SocialPlatform, typeof FacebookIcon> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  x: XIcon,
};

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8 md:flex-row md:justify-between">
        <div>
          <Logo size={30} textClassName="text-lg text-ink">{CLINIC.name}</Logo>
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

        <div className="md:self-start">
          <div className="font-heading mb-3 text-[13px] font-bold text-ink">Follow us</div>
          <div className="flex gap-3">
            {CLINIC.socials.map(({ platform, label, href }) => {
              const Icon = SOCIAL_ICONS[platform];
              return (
                <a
                  key={platform}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  // The glyph is aria-hidden, so the link needs its own name for screen readers.
                  aria-label={`${CLINIC.name} on ${label}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-tint text-primary transition-colors hover:bg-primary hover:text-white"
                >
                  <Icon />
                </a>
              );
            })}
          </div>
        </div>
      </div>
      <div className="border-t border-border/60 px-5 py-5 text-center text-xs text-placeholder sm:px-8">
        © {new Date().getFullYear()} {CLINIC.name}. All rights reserved.
      </div>
    </footer>
  );
}
