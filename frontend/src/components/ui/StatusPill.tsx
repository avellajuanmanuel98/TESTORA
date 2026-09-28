import { cn } from "@/lib/cn";

export type Tone = "neutral" | "accent" | "success" | "danger" | "warning" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-fg-secondary border-border-default",
  accent: "bg-accent-subtle text-accent border-accent-subtle-border",
  success: "bg-success-subtle text-success border-success-subtle-border",
  danger: "bg-danger-subtle text-danger border-danger-subtle-border",
  warning: "bg-warning-subtle text-warning border-warning-subtle-border",
  info: "bg-info-subtle text-info border-info-subtle-border",
};

const dotClasses: Record<Tone, string> = {
  neutral: "bg-fg-muted",
  accent: "bg-accent",
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
};

interface StatusPillProps {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export function StatusPill({ tone = "neutral", children, dot = true, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px] font-medium leading-none",
        toneClasses[tone],
        className
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dotClasses[tone])} aria-hidden />}
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
