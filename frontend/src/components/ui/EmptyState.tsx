import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-default px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex size-9 items-center justify-center rounded-lg bg-surface-sunken text-fg-muted">
        <Icon className="size-[18px]" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[13px] font-medium text-fg-primary">{title}</p>
        {description && <p className="max-w-sm text-[13px] text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
