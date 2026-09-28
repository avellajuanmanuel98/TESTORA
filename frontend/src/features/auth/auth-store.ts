import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { SessionUser } from "@/features/auth/types";

interface AuthState {
  access: string | null;
  refresh: string | null;
  user: SessionUser | null;
  setSession: (session: { access: string; refresh: string; user: SessionUser }) => void;
  setAccessToken: (access: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      access: null,
      refresh: null,
      user: null,
      setSession: ({ access, refresh, user }) => set({ access, refresh, user }),
      setAccessToken: (access) => set({ access }),
      clear: () => set({ access: null, refresh: null, user: null }),
    }),
    { name: "testora-session" }
  )
);

export const useCurrentUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => Boolean(state.access));
