import { Toggle } from "@/components/ui/Toggle";
import type { WorkingHours, WorkingHoursBlock, Weekday } from "@/types/api";

const DAYS: { key: Weekday; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const DEFAULT_BLOCK: WorkingHoursBlock = { start: "09:00", end: "17:00" };

export function WorkingHoursEditor({ value, onChange }: { value: WorkingHours; onChange: (next: WorkingHours) => void }) {
  function toggleDay(day: Weekday, on: boolean) {
    const next = { ...value };
    if (on) next[day] = next[day]?.length ? next[day] : [{ ...DEFAULT_BLOCK }];
    else delete next[day];
    onChange(next);
  }

  function updateBlock(day: Weekday, index: number, field: keyof WorkingHoursBlock, blockValue: string) {
    const blocks = [...(value[day] ?? [])];
    blocks[index] = { ...blocks[index], [field]: blockValue };
    onChange({ ...value, [day]: blocks });
  }

  function addBlock(day: Weekday) {
    onChange({ ...value, [day]: [...(value[day] ?? []), { ...DEFAULT_BLOCK }] });
  }

  function removeBlock(day: Weekday, index: number) {
    const blocks = (value[day] ?? []).filter((_, i) => i !== index);
    onChange({ ...value, [day]: blocks });
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {DAYS.map(({ key, label }) => {
        const blocks = value[key] ?? [];
        const on = blocks.length > 0;
        return (
          <div key={key} className="rounded-xl bg-surface-alt px-4 py-3.5">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-bold text-ink">{label}</div>
              <Toggle checked={on} onChange={() => toggleDay(key, !on)} />
            </div>

            {on && (
              <div className="mt-3 flex flex-col gap-2">
                {blocks.map((block, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={block.start}
                      onChange={(e) => updateBlock(key, i, "start", e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink"
                    />
                    <span className="flex-shrink-0 text-xs text-placeholder">to</span>
                    <input
                      type="time"
                      value={block.end}
                      onChange={(e) => updateBlock(key, i, "end", e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink"
                    />
                    <button
                      type="button"
                      onClick={() => removeBlock(key, i)}
                      className="flex-shrink-0 text-xs font-bold text-coral-alt hover:text-coral-alt/70"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addBlock(key)} className="self-start text-xs font-bold text-primary">
                  + Add block
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
