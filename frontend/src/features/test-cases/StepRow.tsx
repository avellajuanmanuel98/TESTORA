import { type DragEvent, useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  GripVertical,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusPill } from "@/components/ui/StatusPill";
import { ACTION_ICONS } from "@/features/test-cases/action-icons";
import { StepParamsForm } from "@/features/test-cases/StepParamsForm";
import type { ActionDefinition, TestStep } from "@/features/test-cases/types";
import { cn } from "@/lib/cn";

interface Draft {
  params: Record<string, string>;
  note: string;
  timeout_ms: number;
  screenshot_on_fail: boolean;
}

function draftFromStep(step: TestStep): Draft {
  return {
    params: { ...step.params },
    note: step.note,
    timeout_ms: step.timeout_ms,
    screenshot_on_fail: step.screenshot_on_fail,
  };
}

function isDirty(step: TestStep, draft: Draft): boolean {
  return (
    JSON.stringify(step.params) !== JSON.stringify(draft.params) ||
    step.note !== draft.note ||
    step.timeout_ms !== draft.timeout_ms ||
    step.screenshot_on_fail !== draft.screenshot_on_fail
  );
}

interface StepRowProps {
  step: TestStep;
  action: ActionDefinition | undefined;
  expanded: boolean;
  canEdit: boolean;
  isTechnical: boolean;
  saving: boolean;
  onToggleExpand: () => void;
  onSave: (draft: Draft) => void;
  onToggleEnabled: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  dragHandlers: {
    draggable: boolean;
    onDragStart: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
    onDragEnd: () => void;
  };
  isDragOver: boolean;
}

export function StepRow({
  step,
  action,
  expanded,
  canEdit,
  isTechnical,
  saving,
  onToggleExpand,
  onSave,
  onToggleEnabled,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  dragHandlers,
  isDragOver,
}: StepRowProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFromStep(step));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const Icon = ACTION_ICONS[step.action_type] ?? ChevronDown;
  const dirty = isDirty(step, draft);

  useEffect(() => {
    if (!expanded) setDraft(draftFromStep(step));
  }, [expanded, step]);

  function handleSave() {
    onSave(draft);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }

  return (
    <div
      className={cn(
        "border-b border-border-default last:border-b-0",
        isDragOver && "border-t-2 border-t-accent",
        !step.enabled && "opacity-60"
      )}
      {...dragHandlers}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        {canEdit && (
          <span className="cursor-grab text-fg-muted active:cursor-grabbing" aria-hidden>
            <GripVertical className="size-4" />
          </span>
        )}
        <span className="w-6 shrink-0 text-right font-mono text-[12px] text-fg-muted">
          {String(step.order).padStart(2, "0")}
        </span>
        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-fg-secondary">
          <Icon className="size-3.5" aria-hidden />
        </div>

        <button
          type="button"
          onClick={onToggleExpand}
          className="flex flex-1 items-center gap-2 overflow-hidden text-left"
        >
          <span className="shrink-0 text-[13px] font-medium text-fg-primary">{step.action_label}</span>
          <span
            className={cn(
              "truncate text-[13px] text-fg-muted",
              isTechnical && "rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[12px] text-fg-secondary"
            )}
          >
            {step.summary}
          </span>
        </button>

        {!step.enabled && (
          <StatusPill tone="neutral" dot={false}>
            Deshabilitado
          </StatusPill>
        )}
        {justSaved && (
          <span className="flex items-center gap-1 text-[12px] font-medium text-success">
            <Check className="size-3.5" /> Guardado
          </span>
        )}

        <ChevronDown
          className={cn("size-4 shrink-0 text-fg-muted transition-transform", expanded && "rotate-180")}
          aria-hidden
        />

        {canEdit && (
          <DropdownMenu
            trigger={() => (
              <Button variant="ghost" size="icon" aria-label="Más acciones">
                <MoreHorizontal className="size-4" />
              </Button>
            )}
            items={[
              { label: "Mover arriba", onSelect: onMoveUp },
              { label: "Mover abajo", onSelect: onMoveDown },
              { label: step.enabled ? "Deshabilitar" : "Habilitar", onSelect: onToggleEnabled },
              { label: "Duplicar", icon: <Copy className="size-3.5" />, onSelect: onDuplicate },
              {
                label: "Eliminar",
                icon: <Trash2 className="size-3.5" />,
                danger: true,
                onSelect: () => setConfirmingDelete(true),
              },
            ]}
          />
        )}
      </div>

      {expanded && action && (
        <div className="border-t border-border-default bg-surface-sunken/50 px-4 py-4">
          <StepParamsForm
            action={action}
            values={draft.params}
            onChange={(key, value) =>
              setDraft((d) => ({ ...d, params: { ...d.params, [key]: value } }))
            }
          />

          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border-default pt-3">
            <Input
              label="Timeout (ms)"
              type="number"
              value={draft.timeout_ms}
              onChange={(e) => setDraft((d) => ({ ...d, timeout_ms: Number(e.target.value) }))}
            />
            <Input
              label="Nota (opcional)"
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              placeholder="Contexto para el equipo"
            />
          </div>
          <label className="mt-3 flex items-center gap-2 text-[13px] text-fg-secondary">
            <input
              type="checkbox"
              checked={draft.screenshot_on_fail}
              onChange={(e) => setDraft((d) => ({ ...d, screenshot_on_fail: e.target.checked }))}
              className="size-3.5 accent-accent"
            />
            Capturar screenshot si este step falla
          </label>

          {canEdit && (
            <div className="mt-4 flex items-center justify-end gap-2">
              {dirty && <span className="mr-auto text-[12px] text-warning">Cambios sin guardar</span>}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDraft(draftFromStep(step))}
                disabled={!dirty}
              >
                Descartar
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={!dirty} loading={saving}>
                Guardar
              </Button>
            </div>
          )}
        </div>
      )}

      <Modal
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title="Eliminar step"
        description={`“${step.action_label}: ${step.summary}” se eliminará de este test case.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmingDelete(false);
                onDelete();
              }}
            >
              Eliminar
            </Button>
          </>
        }
      >
        Esta acción no se puede deshacer.
      </Modal>
    </div>
  );
}
