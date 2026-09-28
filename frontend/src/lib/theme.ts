import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "testora-theme";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return (document.documentElement.getAttribute("data-theme") as Theme) || "light";
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* private browsing / storage blocked — theme just won't persist */
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return { theme, setTheme: setThemeState, toggle };
}
