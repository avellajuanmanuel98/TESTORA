import { cn } from "@/lib/cn";

export type Tone = "neutral" | "accent" | "success" | "danger" | "warning" | "info";

const markClasses: Record<Tone, string> = {
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

interface StatusMarkProps {
  tone: Tone;
  /** Reserve for states that are genuinely happening right now (active,
   * running) — not a generic "looks nice" flourish. */
  live?: boolean;
}

/** The square blip shared by StatusDot and StatusPill. Square, not a
 * circle — every other status dot in every dashboard is a circle; this is
 * Assuria's own mark, echoing the squared-off logo. */
function StatusMark({ tone, live }: StatusMarkProps) {
  return (
    <span className="relative inline-flex size-[7px] shrink-0">
      {live && (
        <span
          className={cn("status-pulse-ring absolute inset-0 rounded-[2px]", markClasses[tone])}
          aria-hidden
        />
      )}
      <span className={cn("relative size-full rounded-[2px]", markClasses[tone])} aria-hidden />
    </span>
  );
}

interface StatusPillProps {
  tone?: Tone;
  children: React.ReactNode;
  /** Marks a genuinely live state (active, running) with a soft pulse. */
  live?: boolean;
  className?: string;
}

/** Prominent, standalone status (page headers, breadcrumbs). No capsule, no
 * fill — a square mark plus bold small-caps text. Reads as a signal, not
 * as the same colored-badge component every SaaS dashboard reuses. */
export function StatusPill({ tone = "neutral", children, live, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider leading-none",
        textClasses[tone],
        className
      )}
    >
      <StatusMark tone={tone} live={live} />
      {children}
    </span>
  );
}

/** Status inside a dense row (tables, lists): the same square mark plus
 * text, sized for tabular density. */
export function StatusDot({ tone = "neutral", children, live, className }: StatusPillProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px]", textClasses[tone], className)}>
      <StatusMark tone={tone} live={live} />
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
