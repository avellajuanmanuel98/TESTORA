import { useEffect } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

import { cn } from "@/lib/cn";
import { useToastStore } from "@/components/ui/toast-store";

const icons = {
  success: CheckCircle2,
  danger: XCircle,
  info: Info,
};

const toneClasses = {
  success: "border-success-subtle-border bg-success-subtle text-success",
  danger: "border-danger-subtle-border bg-danger-subtle text-danger",
  info: "border-info-subtle-border bg-info-subtle text-info",
};

function ToastItem({ id, tone, message }: { id: number; tone: "success" | "danger" | "info"; message: string }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const Icon = icons[tone];

  useEffect(() => {
    const timer = setTimeout(() => dismiss(id), 4000);
    return () => clearTimeout(timer);
  }, [id, dismiss]);

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-medium shadow-panel",
        toneClasses[tone]
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="flex-1 text-fg-primary">{message}</p>
      <button
        type="button"
        onClick={() => dismiss(id)}
        className="text-fg-muted hover:text-fg-primary"
        aria-label="Descartar"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[340px] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem {...t} />
        </div>
      ))}
    </div>
  );
}
