import { cn } from "@/lib/cn";

export type Tone = "neutral" | "accent" | "success" | "danger" | "warning" | "info";

const solidClasses: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-fg-secondary",
  accent: "bg-accent-subtle text-accent",
  success: "bg-success-subtle text-success",
  danger: "bg-danger-subtle text-danger",
  warning: "bg-warning-subtle text-warning",
  info: "bg-info-subtle text-info",
};

const dotClasses: Record<Tone, string> = {
  neutral: "bg-fg-muted",
  accent: "bg-accent",
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
};

const textClasses: Record<Tone, string> = {
  neutral: "text-fg-secondary",
  accent: "text-accent",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
};

interface StatusPillProps {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}

/** A compact tag for prominent, standalone status (page headers, breadcrumbs).
 * Solid, quiet fill — never a bright full-pill badge. */
export function StatusPill({ tone = "neutral", children, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] px-1.5 py-[3px] text-[11px] font-semibold uppercase tracking-wide leading-none",
        solidClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Status inside a dense row (tables, lists): a dot plus text, no capsule —
 * reads as data, not as decoration. This is the default for tabular status. */
export function StatusDot({ tone = "neutral", children, className }: StatusPillProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px]", textClasses[tone], className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", dotClasses[tone])} aria-hidden />
      {children}
    </span>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border-default bg-surface-sunken px-1.5 py-0.5 text-[12px] font-medium text-fg-secondary",
        className
      )}
    >
      {children}
    </span>
  );
}
