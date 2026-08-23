import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PillProps {
  children: ReactNode;
  bg: string;
  color: string;
  className?: string;
}

export function Pill({ children, bg, color, className }: PillProps) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold", className)}
      style={{ background: bg, color }}
    >
      {children}
    </span>
  );
}
