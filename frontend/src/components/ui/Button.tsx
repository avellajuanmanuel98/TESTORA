import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: cn(
    "bg-accent text-fg-on-accent border border-transparent",
    "hover:bg-accent-hover",
    "active:brightness-95",
    "disabled:bg-border-strong disabled:text-fg-muted"
  ),
  secondary: cn(
    "bg-surface text-fg-primary border border-border-default",
    "hover:bg-surface-sunken hover:border-border-strong",
    "active:bg-surface-sunken",
    "disabled:text-fg-muted disabled:bg-surface"
  ),
  ghost: cn(
    "bg-transparent text-fg-secondary border border-transparent",
    "hover:bg-surface-sunken hover:text-fg-primary",
    "active:bg-surface-sunken",
    "disabled:text-fg-muted"
  ),
  danger: cn(
    "bg-danger text-white border border-transparent",
    "hover:brightness-90",
    "active:brightness-95",
    "disabled:bg-border-strong disabled:text-fg-muted"
  ),
};

const sizeClasses: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[13px] gap-1.5",
  md: "h-8 px-3 text-[13px] gap-1.5",
  icon: "h-8 w-8 justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center rounded-md font-medium transition-colors duration-100",
          "disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
