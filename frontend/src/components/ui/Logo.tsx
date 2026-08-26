import { cn } from "@/lib/cn";
import logoColour from "@/assets/logo.webp";
import logoWhite from "@/assets/logo-white.webp";

interface LogoMarkProps {
  /** `white` is a flat silhouette for dark backgrounds — the brand blue goes muddy against the
   *  auth artwork panel, where there's no light surface behind it. */
  variant?: "colour" | "white";
  /** Rendered box size in px. The source is 256px square, so anything up to that stays crisp. */
  size?: number;
  className?: string;
}

export function LogoMark({ variant = "colour", size = 28, className }: LogoMarkProps) {
  return (
    <img
      src={variant === "white" ? logoWhite : logoColour}
      width={size}
      height={size}
      // Decorative wherever it sits beside the wordmark, which already names the clinic — a second
      // reading of "Bright Smile" would just be noise for a screen reader.
      alt=""
      aria-hidden="true"
      className={cn("flex-shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

interface LogoProps extends LogoMarkProps {
  /** Wordmark text; pass a node to style parts of it (e.g. a coloured second word). */
  children?: React.ReactNode;
  textClassName?: string;
}

/** Mark plus wordmark lockup, so the spacing between them stays consistent everywhere it appears. */
export function Logo({ variant = "colour", size = 28, className, textClassName, children = "Bright Smile" }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark variant={variant} size={size} />
      <span className={cn("font-heading font-extrabold whitespace-nowrap", textClassName)}>{children}</span>
    </span>
  );
}
