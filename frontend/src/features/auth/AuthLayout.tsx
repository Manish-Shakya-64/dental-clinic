import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface AuthLayoutProps {
  /** Imported asset URL for the artwork panel. */
  image: string;
  imageAlt: string;
  /** Overlay copy on the artwork panel — sets the tone before the form is read. */
  headline: string;
  tagline: string;
  /** Short reassurance points shown under the tagline. */
  points?: string[];
  children: ReactNode;
}

function CheckIcon() {
  return (
    <span className="mt-0.5 flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Split-screen shell shared by every auth screen: clinic photography on one side, the form on a
 *  clean white panel on the other. Below `lg` the artwork is dropped entirely rather than shrunk —
 *  on a phone it would push the form below the fold for no informational gain. */
export function AuthLayout({ image, imageAlt, headline, tagline, points, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-2">
      <aside className="sticky top-0 hidden h-screen self-start overflow-hidden lg:block">
        <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" />
        {/* Two targeted scrims rather than one flat wash: the photo stays bright and saturated in
          * the middle, and only the bands actually sitting behind text get darkened. */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink/92 via-ink/55 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/45 to-transparent" />

        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="font-heading text-[19px] font-extrabold text-white">
            Bright Smile
          </Link>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <h2 className="font-heading max-w-md text-[30px] leading-tight font-extrabold text-white">{headline}</h2>
            <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-white/80">{tagline}</p>

            {points && points.length > 0 && (
              <ul className="mt-7 flex flex-col gap-2.5">
                {points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-[13.5px] font-semibold text-white/90">
                    <CheckIcon />
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[420px]"
        >
          {/* The artwork panel carries the brand on desktop; on mobile it's gone, so the wordmark
            * has to appear here instead. */}
          <Link to="/" className="font-heading mb-8 block text-center text-[19px] font-extrabold text-ink lg:hidden">
            Bright Smile
          </Link>
          {children}
        </motion.div>
      </main>
    </div>
  );
}

interface AuthHeadingProps {
  title: string;
  subtitle: string;
}

export function AuthHeading({ title, subtitle }: AuthHeadingProps) {
  return (
    <div className="mb-7">
      <h1 className="font-heading text-[26px] leading-tight font-extrabold text-ink">{title}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-faint">{subtitle}</p>
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return <div className="rounded-xl bg-coral-alt/10 px-3.5 py-3 text-[12.5px] font-semibold text-coral-alt">{message}</div>;
}
