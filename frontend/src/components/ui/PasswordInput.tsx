import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { fieldBase, fieldInvalid } from "@/components/ui/Input";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { invalid?: boolean };

/** A password `<input>` with a show/hide toggle — the eye icon flips the field between
 *  `type="password"` and `type="text"` without ever exposing the value in an extra control. */
export function PasswordInput({ className, invalid, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input type={visible ? "text" : "password"} className={cn(fieldBase, "pr-10", invalid && fieldInvalid, className)} {...rest} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-placeholder transition-colors hover:text-ink-soft"
      >
        {visible ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
      </button>
    </div>
  );
}
