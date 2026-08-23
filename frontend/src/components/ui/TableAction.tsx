import type { ComponentType } from "react";
import { cn } from "@/lib/cn";

interface TableActionProps {
  /** A lucide icon component, e.g. `Pencil`. */
  icon: ComponentType<{ size?: number | string; strokeWidth?: number | string }>;
  /** Names the action for screen readers and as the hover tooltip — icon-only buttons have no
   *  visible text to serve as their accessible name. */
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

/** The single affordance for row-level actions in a data table. Rows themselves are never
 *  clickable: a whole-row click target makes destructive or navigational side effects too easy to
 *  trigger by accident, and gives no hint about what a click will actually do. */
export function TableAction({ icon: Icon, label, onClick, variant = "default", disabled }: TableActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variant === "danger"
          ? "text-coral-alt hover:bg-coral-alt/10"
          : "text-primary hover:bg-primary/10",
      )}
    >
      <Icon size={16} strokeWidth={2} />
    </button>
  );
}
