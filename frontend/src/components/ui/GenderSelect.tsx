import { cn } from "@/lib/cn";
import { Field, fieldInvalid } from "@/components/ui/Input";
import { GENDER_OPTIONS } from "@/lib/personName";
import type { Gender } from "@/types/api";

interface GenderSelectProps {
  value: Gender | "";
  onChange: (next: Gender) => void;
  label?: string;
  className?: string;
  required?: boolean;
  error?: string;
}

export function GenderSelect({ value, onChange, label = "Gender", className, required, error }: GenderSelectProps) {
  return (
    <Field label={label} className={className} error={error}>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value as Gender)}
        className={cn(
          "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
          error && fieldInvalid,
        )}
      >
        <option value="" disabled>
          Select…
        </option>
        {GENDER_OPTIONS.map((g) => (
          <option key={g.value} value={g.value}>
            {g.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
