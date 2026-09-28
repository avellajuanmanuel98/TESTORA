import { Lock } from "lucide-react";
import { NavLink } from "react-router-dom";

import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";

interface ProjectRailProps {
  projectId: string;
}

const ITEMS = [
  { to: "", label: "Overview", end: true },
  { to: "test-cases", label: "Test Cases" },
  { to: "environments", label: "Environments" },
  { to: "settings", label: "Settings" },
];

const UPCOMING = ["Suites", "Runs"];

export function ProjectRail({ projectId }: ProjectRailProps) {
  const base = `/projects/${projectId}`;

  return (
    <nav className="flex w-48 shrink-0 flex-col gap-0.5 border-r border-border-default px-2 py-4">
      {ITEMS.map((item) => (
        <NavLink
          key={item.label}
          to={`${base}/${item.to}`}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
              isActive
                ? "bg-accent-subtle text-accent"
                : "text-fg-secondary hover:bg-surface-sunken hover:text-fg-primary"
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
      {UPCOMING.map((label) => (
        <Tooltip key={label} label="Disponible en la próxima fase" side="bottom">
          <div className="flex w-full cursor-not-allowed items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] font-medium text-fg-muted/60">
            {label}
            <Lock className="size-3" aria-hidden />
          </div>
        </Tooltip>
      ))}
    </nav>
  );
}
