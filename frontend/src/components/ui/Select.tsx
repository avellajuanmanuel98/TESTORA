import { type SelectHTMLAttributes, forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hint, error, id, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-[13px] font-medium text-fg-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error)}
            className={cn(
              "h-8 w-full appearance-none rounded-md border bg-surface pl-2.5 pr-8 text-[13px] text-fg-primary",
              "transition-colors duration-100",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              error
                ? "border-danger focus:ring-danger/30"
                : "border-border-default hover:border-border-strong focus:border-accent focus:ring-accent/20",
              "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-muted",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-muted"
            aria-hidden
          />
        </div>
        {error ? (
          <span className="text-[12px] text-danger">{error}</span>
        ) : hint ? (
          <span className="text-[12px] text-fg-muted">{hint}</span>
        ) : null}
      </div>
    );
  }
);
Select.displayName = "Select";
