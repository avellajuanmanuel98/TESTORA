import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useIsAuthenticated } from "@/features/auth/auth-store";

export function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
