import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/Spinner";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "dangerSolid" | "amber" | "white" | "whiteOutline";

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
>;

interface ButtonProps extends NativeButtonProps {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
  fullWidth?: boolean;
}

const WHITE_TEXT_VARIANTS = new Set<Variant>(["primary", "secondary", "dangerSolid", "whiteOutline"]);

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-[0_8px_18px_rgba(91,110,225,0.3)] hover:bg-accent-dark",
  secondary: "bg-primary text-white shadow-[0_6px_14px_rgba(61,125,191,0.3)] hover:bg-primary-dark",
  outline: "bg-transparent text-primary border-[1.5px] border-primary hover:bg-primary-tint",
  ghost: "bg-transparent text-ink-soft hover:bg-surface-alt",
  danger: "bg-transparent text-coral-alt border-[1.5px] border-coral-alt hover:bg-coral-alt/10",
  dangerSolid: "bg-coral-alt text-white shadow-[6px_6px_14px_rgba(217,118,95,0.3)] hover:opacity-90",
  amber: "bg-amber text-[#5A3D0A] shadow-[0_6px_14px_rgba(245,193,119,0.4)] hover:opacity-90",
  /** Solid white — for a primary action sitting on a colored/gradient panel (e.g. a CTA banner). */
  white: "bg-white text-primary shadow-[0_6px_14px_rgba(0,0,0,0.15)] hover:bg-white/90",
  /** Outlined in white — for a secondary action on a colored/gradient panel. */
  whiteOutline: "bg-transparent text-white border-[1.5px] border-white/60 hover:bg-white/10",
};

export function Button({
  variant = "primary",
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { scale: 1.015 }}
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        fullWidth && "w-full",
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size={16} className={WHITE_TEXT_VARIANTS.has(variant) ? "text-white" : "text-current"} />}
      {children}
    </motion.button>
  );
}
