import { type KeyboardEvent, useRef } from "react";

import { cn } from "@/lib/cn";

export interface TabItem {
  value: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const enabled = items.filter((i) => !i.disabled);
    const currentIndex = enabled.findIndex((i) => i.value === value);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % enabled.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + enabled.length) % enabled.length;

    if (nextIndex !== null) {
      event.preventDefault();
      const next = enabled[nextIndex];
      onChange(next.value);
      refs.current[next.value]?.focus();
    }
  }

  return (
    <div
      role="tablist"
      onKeyDown={handleKeyDown}
      className={cn("flex items-center gap-5 border-b border-border-default", className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[item.value] = el;
            }}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative flex items-center gap-1.5 py-2.5 text-[13px] font-medium transition-colors",
              "disabled:cursor-not-allowed disabled:text-fg-muted/60",
              active ? "text-fg-primary" : "text-fg-secondary hover:text-fg-primary"
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] leading-[18px]",
                  active ? "bg-accent-subtle text-accent" : "bg-surface-sunken text-fg-muted"
                )}
              >
                {item.count}
              </span>
            )}
            {active && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}
