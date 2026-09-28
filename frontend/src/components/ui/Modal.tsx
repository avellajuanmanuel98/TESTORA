import { type ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto rounded-lg border border-border-default bg-surface-raised p-0 shadow-panel-lg backdrop:bg-fg-primary/30 backdrop:backdrop-blur-[1px]"
    >
      <div className="flex w-[440px] max-w-[90vw] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-border-default px-4 py-3.5">
          <div>
            <h2 className="text-[14px] font-semibold text-fg-primary">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-fg-muted">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="size-4" />
          </Button>
        </header>
        <div className="px-4 py-4 text-[13px] text-fg-primary">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-border-default px-4 py-3">{footer}</footer>
        )}
      </div>
    </dialog>
  );
}
