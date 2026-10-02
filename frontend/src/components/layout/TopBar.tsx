import { LogOut, Moon, Sun, TerminalSquare } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/cn";
import { useAuthStore, useCurrentUser } from "@/features/auth/auth-store";
import { useTheme } from "@/lib/theme";

const NAV_ITEMS = [
  { to: "/", label: "Panel", end: true },
  { to: "/projects", label: "Proyectos", end: false },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function TopBar() {
  const user = useCurrentUser();
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-default bg-surface px-4">
      <div className="flex h-full items-center">
        <NavLink to="/" className="flex items-center gap-2 border-r border-border-default py-3 pr-4">
          <div className="flex size-6 items-center justify-center rounded-md bg-fg-primary text-surface">
            <TerminalSquare className="size-3.5" aria-hidden />
          </div>
          <span className="text-[14px] font-bold tracking-tight text-fg-primary">Assuria</span>
        </NavLink>
        <nav className="flex h-full items-center gap-4 pl-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "text-[13px] font-medium text-fg-muted transition-colors hover:text-fg-primary",
                  isActive && "text-fg-primary"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          className="flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg-primary"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {user && (
          <DropdownMenu
            align="right"
            trigger={() => (
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-full bg-accent-subtle text-[12px] font-semibold text-accent hover:brightness-95"
              >
                {initials(user.full_name || user.email)}
              </button>
            )}
            items={[
              {
                label: "Cerrar sesión",
                icon: <LogOut className="size-3.5" />,
                onSelect: () => {
                  clear();
                  navigate("/login", { replace: true });
                },
              },
            ]}
          />
        )}
      </div>
    </header>
  );
}
