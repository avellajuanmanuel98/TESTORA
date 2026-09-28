import { useState } from "react";
import { ArrowDown, ArrowUp, FlaskConical, Trash2 } from "lucide-react";
import { useParams } from "react-router-dom";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusDot } from "@/components/ui/StatusPill";
import { toast } from "@/components/ui/toast-store";
import { useCurrentUser } from "@/features/auth/auth-store";
import { useProjectContext } from "@/features/projects/ProjectContext";
import { useTestCases } from "@/features/test-cases/api";
import { TEST_CASE_STATUS_LABEL, TEST_CASE_STATUS_TONE } from "@/lib/labels";
import {
  useAddSuiteItem,
  useRemoveSuiteItem,
  useReorderSuiteItems,
  useTestSuite,
} from "@/features/test-suites/api";
import { ApiError } from "@/lib/api-client";

const ROLE_RANK: Record<string, number> = { viewer: 0, qa_engineer: 1, qa_manager: 2, admin: 3 };

export function TestSuiteDetailPage() {
  const { suiteId, projectId } = useParams<{ suiteId: string; projectId: string }>();
  const project = useProjectContext();
  const user = useCurrentUser();
  const { data: suite, isLoading } = useTestSuite(suiteId);
  const { data: testCases } = useTestCases(projectId!);
  const [addingId, setAddingId] = useState("");

  const addItem = useAddSuiteItem(suiteId!, projectId!);
  const removeItem = useRemoveSuiteItem(suiteId!, projectId!);
  const reorderItems = useReorderSuiteItems(suiteId!, projectId!);

  const membership = project.members.find((m) => m.user.id === user?.id);
  const canEdit = Boolean(membership && ROLE_RANK[membership.role] >= ROLE_RANK.qa_engineer);

  if (isLoading || !suite) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Skeleton className="mb-4 h-6 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const availableTestCases = (testCases?.results ?? []).filter(
    (tc) => !suite.items.some((item) => item.test_case === tc.id)
  );

  function moveByOffset(itemId: number, offset: number) {
    const ids = suite!.items.map((i) => i.id);
    const index = ids.indexOf(itemId);
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= ids.length) return;
    [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
    reorderItems.mutate(ids, {
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "No se pudo reordenar."),
    });
  }

  function handleAdd(value: string) {
    if (!value) return;
    addItem.mutate(Number(value), {
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "No se pudo agregar el caso de prueba."),
    });
    setAddingId("");
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-4">
        <Breadcrumb
          items={[
            { label: project.name, to: `/projects/${projectId}` },
            { label: "Suites", to: `/projects/${projectId}/test-suites` },
            { label: suite.name },
          ]}
        />
      </div>

      <div className="rounded-lg border border-border-default bg-surface-raised">
        <div className="border-b border-border-default px-6 py-4">
          <h1 className="text-[16px] font-semibold text-fg-primary">{suite.name}</h1>
          {suite.description && <p className="mt-1 text-[13px] text-fg-muted">{suite.description}</p>}
        </div>

        {suite.items.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title="Sin casos de prueba en esta suite"
            description="Agrega casos de prueba existentes del proyecto para agruparlos acá."
            className="border-0"
          />
        ) : (
          <div className="divide-y divide-border-default">
            {suite.items.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-6 shrink-0 text-right font-mono text-[12px] text-fg-muted">
                  {String(item.order).padStart(2, "0")}
                </span>
                <span className="flex-1 truncate text-[13px] font-medium text-fg-primary">
                  {item.test_case_name}
                </span>
                <StatusDot
                  tone={TEST_CASE_STATUS_TONE[item.test_case_status]}
                  live={item.test_case_status === "active"}
                >
                  {TEST_CASE_STATUS_LABEL[item.test_case_status]}
                </StatusDot>
                {canEdit && (
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      onClick={() => moveByOffset(item.id, -1)}
                      aria-label="Mover arriba"
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={index === suite.items.length - 1}
                      onClick={() => moveByOffset(item.id, 1)}
                      aria-label="Mover abajo"
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        removeItem.mutate(item.id, {
                          onError: (err) =>
                            toast.error(err instanceof ApiError ? err.message : "No se pudo quitar el caso de prueba."),
                        })
                      }
                      aria-label={`Quitar ${item.test_case_name}`}
                    >
                      <Trash2 className="size-3.5 text-fg-muted hover:text-danger" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {canEdit && (
          <div className="border-t border-border-default p-3">
            <div className="relative inline-flex w-64">
              <Select
                value={addingId}
                onChange={(e) => handleAdd(e.target.value)}
                disabled={availableTestCases.length === 0}
              >
                <option value="">
                  {availableTestCases.length === 0 ? "Todos los casos ya están en la suite" : "Agregar caso de prueba…"}
                </option>
                {availableTestCases.map((tc) => (
                  <option key={tc.id} value={tc.id}>
                    {tc.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
