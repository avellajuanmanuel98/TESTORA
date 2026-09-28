import { type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

export interface DropdownMenuItem {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}

interface DropdownMenuProps {
  trigger: (props: { open: boolean }) => ReactNode;
  items: DropdownMenuItem[];
  align?: "left" | "right";
}

export function DropdownMenu({ trigger, items, align = "right" }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger({ open })}</div>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 mt-1.5 min-w-[180px] rounded-md border border-border-default bg-surface-overlay p-1 shadow-panel",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-left text-[13px]",
                "disabled:cursor-not-allowed disabled:text-fg-muted disabled:hover:bg-transparent",
                item.danger ? "text-danger hover:bg-danger-subtle" : "text-fg-primary hover:bg-surface-sunken"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
