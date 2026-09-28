import { type InputHTMLAttributes, forwardRef, useId } from "react";

import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, mono, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-fg-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            "h-8 rounded-md border bg-surface px-2.5 text-[13px] text-fg-primary placeholder:text-fg-muted",
            "transition-colors duration-100",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            mono && "font-mono",
            error
              ? "border-danger focus:ring-danger/30"
              : "border-border-default hover:border-border-strong focus:border-accent focus:ring-accent/20",
            "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-muted",
            className
          )}
          {...props}
        />
        {error ? (
          <span id={`${inputId}-error`} className="text-[12px] text-danger">
            {error}
          </span>
        ) : hint ? (
          <span id={`${inputId}-hint`} className="text-[12px] text-fg-muted">
            {hint}
          </span>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
