import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface MarqueeProps {
  children: ReactNode;
  durationSeconds?: number;
  className?: string;
}

/** Auto-scrolling horizontal strip — the content is rendered twice back-to-back and the whole
 *  track slides left by exactly one copy's width (-50%) on an infinite loop, so the seam is
 *  invisible. Pauses on hover so it's still readable/clickable. */
export function Marquee({ children, durationSeconds = 26, className }: MarqueeProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]",
        className,
      )}
    >
      <div className="flex w-max group-hover:[animation-play-state:paused]" style={{ animation: `marquee ${durationSeconds}s linear infinite` }}>
        <div className="flex flex-none gap-5 pr-5">{children}</div>
        <div className="flex flex-none gap-5 pr-5" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
