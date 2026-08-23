import { useState } from "react";
import type { DailyBucket } from "@/types/api";

function formatShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function BookingsChart({ series }: { series: DailyBucket[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...series.map((d) => d.bookings));
  const labelEvery = Math.ceil(series.length / 8);

  return (
    <div className="relative">
      <div className="flex h-[140px] items-end gap-1">
        {series.map((day, i) => {
          const heightPct = (day.bookings / max) * 100;
          return (
            <div
              key={day.date}
              className="group relative flex-1"
              style={{ height: "100%" }}
              onPointerEnter={() => setHovered(i)}
              onPointerLeave={() => setHovered((h) => (h === i ? null : h))}
              tabIndex={0}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered((h) => (h === i ? null : h))}
            >
              <div className="absolute inset-x-0 bottom-0 flex h-full items-end">
                <div
                  className="w-full rounded-t-[4px] transition-colors"
                  style={{
                    height: `${Math.max(heightPct, day.bookings > 0 ? 4 : 0)}%`,
                    background: hovered === i ? "var(--color-primary)" : "var(--color-chart-bar)",
                  }}
                />
              </div>
              {hovered === i && (
                <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg">
                  <span className="font-bold">{day.bookings}</span> · {formatShort(day.date)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10.5px] text-placeholder">
        {series.map((day, i) =>
          i % labelEvery === 0 ? (
            <span key={day.date} style={{ flex: labelEvery }}>
              {formatShort(day.date)}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
