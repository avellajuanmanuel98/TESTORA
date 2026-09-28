import { Outlet } from "react-router-dom";

import { TopBar } from "@/components/layout/TopBar";
import { Toaster } from "@/components/ui/Toaster";

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <TopBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
