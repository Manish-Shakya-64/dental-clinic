import { Field, Input } from "@/components/ui/Input";
import type { PersonName } from "@/types/api";

interface NameFieldsProps {
  value: PersonName;
  onChange: (next: PersonName) => void;
  className?: string;
  firstNameError?: string;
}

/** First/middle/last name inputs — first name is the only mandatory part. */
export function NameFields({ value, onChange, className, firstNameError }: NameFieldsProps) {
  return (
    <div className={className ?? "grid grid-cols-1 gap-4 sm:grid-cols-3"}>
      <Field label="First name" error={firstNameError}>
        <Input
          required
          invalid={!!firstNameError}
          value={value.first_name}
          onChange={(e) => onChange({ ...value, first_name: e.target.value })}
        />
      </Field>
      <Field label="Middle name (optional)">
        <Input value={value.middle_name ?? ""} onChange={(e) => onChange({ ...value, middle_name: e.target.value })} />
      </Field>
      <Field label="Last name (optional)">
        <Input value={value.last_name ?? ""} onChange={(e) => onChange({ ...value, last_name: e.target.value })} />
      </Field>
    </div>
  );
}
