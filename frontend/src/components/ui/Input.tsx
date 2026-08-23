import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FieldWrapperProps {
  label?: string;
  children: ReactNode;
  className?: string;
  /** Inline validation message shown below the field — the on-screen counterpart to whatever
   *  blocks submission, so the user sees *why* rather than just failing silently. */
  error?: string;
}

export function Field({ label, children, className, error }: FieldWrapperProps) {
  return (
    <div className={className}>
      {/* The error message deliberately sits outside this <label> — a <label> wrapping a control
       *  folds all its text into that control's accessible name, so an error message inside it
       *  would get read/matched as part of the field's name instead of as a separate description. */}
      <label className="block">
        {label && <div className="mb-1.5 text-xs font-bold text-ink-soft">{label}</div>}
        {children}
      </label>
      {error && <div className="mt-1.5 text-[11.5px] font-semibold text-coral-alt">{error}</div>}
    </div>
  );
}

export const fieldBase =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-placeholder outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

export const fieldInvalid = "border-coral-alt focus:border-coral-alt focus:ring-coral-alt/20";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ className, invalid, ...rest }: InputProps) {
  return <input className={cn(fieldBase, invalid && fieldInvalid, className)} {...rest} />;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ className, invalid, ...rest }: TextareaProps) {
  return <textarea className={cn(fieldBase, "resize-none", invalid && fieldInvalid, className)} {...rest} />;
}
