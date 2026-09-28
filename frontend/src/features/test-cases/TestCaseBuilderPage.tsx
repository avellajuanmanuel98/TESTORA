import { type DragEvent, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/toast-store";
import { useCurrentUser } from "@/features/auth/auth-store";
import { useProjectContext } from "@/features/projects/ProjectContext";
import {
  useActions,
  useCreateStep,
  useDeleteStep,
  useDuplicateStep,
  useReorderSteps,
  useTestCase,
  useUpdateStep,
} from "@/features/test-cases/api";
import { CATEGORY_LABELS } from "@/features/test-cases/action-icons";
import { StepRow } from "@/features/test-cases/StepRow";
import { TestCaseHeader } from "@/features/test-cases/TestCaseHeader";
import { RunModal } from "@/features/test-runs/RunModal";
import { ApiError } from "@/lib/api-client";

const ROLE_RANK: Record<string, number> = { viewer: 0, qa_engineer: 1, qa_manager: 2, admin: 3 };

export function TestCaseBuilderPage() {
  const { testCaseId, projectId } = useParams<{ testCaseId: string; projectId: string }>();
  const navigate = useNavigate();
  const project = useProjectContext();
  const user = useCurrentUser();
  const { data: testCase, isLoading } = useTestCase(testCaseId);
  const { data: actions } = useActions();

  const [expandedStepId, setExpandedStepId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [addingAction, setAddingAction] = useState("");
  const [runModalOpen, setRunModalOpen] = useState(false);

  const createStep = useCreateStep(testCaseId!);
  const updateStep = useUpdateStep(testCaseId!);
  const deleteStep = useDeleteStep(testCaseId!);
  const duplicateStep = useDuplicateStep(testCaseId!);
  const reorderSteps = useReorderSteps(testCaseId!);

  const membership = project.members.find((m) => m.user.id === user?.id);
  const canEdit = Boolean(membership && ROLE_RANK[membership.role] >= ROLE_RANK.qa_engineer);

  if (isLoading || !testCase || !actions) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Skeleton className="mb-4 h-6 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const actionsByKey = Object.fromEntries(actions.map((a) => [a.key, a]));
  const actionsByCategory = actions.reduce<Record<string, typeof actions>>((acc, action) => {
    (acc[action.category] ??= []).push(action);
    return acc;
  }, {});

  function handleAddStep(actionKey: string) {
    if (!actionKey) return;
    createStep.mutate(
      { test_case: Number(testCaseId), action_type: actionKey, params: {} },
      {
        onSuccess: (step) => setExpandedStepId(step.id),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "No se pudo agregar el paso."),
      }
    );
    setAddingAction("");
  }

  function moveStep(fromId: number, toId: number) {
    if (fromId === toId) return;
    const ids = testCase!.steps.map((s) => s.id);
    const fromIndex = ids.indexOf(fromId);
    const toIndex = ids.indexOf(toId);
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, fromId);
    reorderSteps.mutate(ids, {
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "No se pudo reordenar."),
    });
  }

  function moveByOffset(stepId: number, offset: number) {
    const ids = testCase!.steps.map((s) => s.id);
    const index = ids.indexOf(stepId);
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= ids.length) return;
    [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
    reorderSteps.mutate(ids, {
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "No se pudo reordenar."),
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-4">
        <Breadcrumb
          items={[
            { label: project.name, to: `/projects/${projectId}` },
            { label: "Casos de prueba", to: `/projects/${projectId}/test-cases` },
            { label: testCase.name },
          ]}
        />
      </div>

      <div className="rounded-lg border border-border-default bg-surface-raised">
        <TestCaseHeader
          testCase={testCase}
          canEdit={canEdit}
          projectId={projectId!}
          onRunClick={() => setRunModalOpen(true)}
        />

        <div>
          {testCase.steps.length === 0 && (
            <p className="px-6 py-10 text-center text-[13px] text-fg-muted">
              Este caso de prueba todavía no tiene pasos. Agrega el primero abajo.
            </p>
          )}
          {testCase.steps.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              action={actionsByKey[step.action_type]}
              expanded={expandedStepId === step.id}
              canEdit={canEdit}
              isTechnical={Boolean(
                actionsByKey[step.action_type]?.params.some((p) => p.type === "selector" || p.type === "url")
              )}
              saving={updateStep.isPending}
              onToggleExpand={() => setExpandedStepId(expandedStepId === step.id ? null : step.id)}
              onSave={(draft) =>
                updateStep.mutate(
                  { id: step.id, ...draft },
                  {
                    onError: (err) =>
                      toast.error(err instanceof ApiError ? err.message : "No se pudo guardar el paso."),
                  }
                )
              }
              onToggleEnabled={() =>
                updateStep.mutate(
                  { id: step.id, enabled: !step.enabled },
                  { onError: (err) => toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar el paso.") }
                )
              }
              onDuplicate={() =>
                duplicateStep.mutate(step.id, {
                  onError: (err) => toast.error(err instanceof ApiError ? err.message : "No se pudo duplicar el paso."),
                })
              }
              onDelete={() =>
                deleteStep.mutate(step.id, {
                  onError: (err) => toast.error(err instanceof ApiError ? err.message : "No se pudo eliminar el paso."),
                })
              }
              onMoveUp={() => moveByOffset(step.id, -1)}
              onMoveDown={() => moveByOffset(step.id, 1)}
              isDragOver={dragOverId === step.id}
              dragHandlers={{
                draggable: canEdit,
                onDragStart: (e: DragEvent) => {
                  setDragId(step.id);
                  e.dataTransfer.effectAllowed = "move";
                },
                onDragOver: (e: DragEvent) => {
                  e.preventDefault();
                  if (dragId !== null && dragId !== step.id) setDragOverId(step.id);
                },
                onDrop: (e: DragEvent) => {
                  e.preventDefault();
                  if (dragId !== null) moveStep(dragId, step.id);
                  setDragId(null);
                  setDragOverId(null);
                },
                onDragEnd: () => {
                  setDragId(null);
                  setDragOverId(null);
                },
              }}
            />
          ))}
        </div>

        {canEdit && (
          <div className="border-t border-border-default p-3">
            <div className="relative inline-flex">
              <select
                value={addingAction}
                onChange={(e) => handleAddStep(e.target.value)}
                className="h-8 cursor-pointer appearance-none rounded-md border border-dashed border-border-strong bg-transparent pl-8 pr-3 text-[13px] font-medium text-fg-secondary hover:border-accent hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="">Agregar paso…</option>
                {Object.entries(actionsByCategory).map(([category, categoryActions]) => (
                  <optgroup key={category} label={CATEGORY_LABELS[category] ?? category}>
                    {categoryActions.map((action) => (
                      <option key={action.key} value={action.key}>
                        {action.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <Plus className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-secondary" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}/test-cases`)}>
          ← Volver a Casos de prueba
        </Button>
      </div>

      <RunModal
        open={runModalOpen}
        onClose={() => setRunModalOpen(false)}
        projectId={projectId!}
        testCaseId={testCase.id}
        onRunCreated={(runId) => navigate(`/projects/${projectId}/test-runs/${runId}`)}
      />
    </div>
  );
}
