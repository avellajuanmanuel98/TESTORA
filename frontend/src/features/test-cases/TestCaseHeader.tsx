import { useState } from "react";
import { PlayCircle, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge, StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { InlineEditable } from "@/components/ui/InlineEditable";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/toast-store";
import { useDeleteTestCase, useUpdateTestCase } from "@/features/test-cases/api";
import type { TestCaseDetail, TestCaseStatus } from "@/features/test-cases/types";
import { ApiError } from "@/lib/api-client";
import { TEST_CASE_STATUS_LABEL, TEST_CASE_STATUS_TONE } from "@/lib/labels";

export function TestCaseHeader({
  testCase,
  canEdit,
  canDelete,
  projectId,
  onRunClick,
}: {
  testCase: TestCaseDetail;
  canEdit: boolean;
  canDelete: boolean;
  projectId: string;
  onRunClick: () => void;
}) {
  const update = useUpdateTestCase(testCase.id.toString(), projectId);
  const deleteTestCase = useDeleteTestCase(projectId);
  const navigate = useNavigate();
  const [newTag, setNewTag] = useState("");

  function save(payload: Parameters<typeof update.mutate>[0]) {
    update.mutate(payload, {
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "No se pudo guardar."),
    });
  }

  return (
    <div className="border-b border-border-default px-6 py-4">
      <div className="flex items-center gap-3">
        <InlineEditable
          value={testCase.name}
          onCommit={(name) => save({ name })}
          canEdit={canEdit}
          className="text-[16px] font-semibold text-fg-primary"
        />
        <StatusPill tone={TEST_CASE_STATUS_TONE[testCase.status]} live={testCase.status === "active"}>
          {TEST_CASE_STATUS_LABEL[testCase.status]}
        </StatusPill>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={onRunClick} disabled={testCase.steps.length === 0}>
            <PlayCircle className="size-3.5" />
            Ejecutar
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                deleteTestCase.mutate(testCase.id, {
                  onSuccess: () => navigate(`/projects/${projectId}/test-cases`),
                  onError: (err) =>
                    toast.error(err instanceof ApiError ? err.message : "No se pudo eliminar el caso de prueba."),
                })
              }
              aria-label="Eliminar caso de prueba"
            >
              <Trash2 className="size-3.5 text-fg-muted hover:text-danger" />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-1">
        <InlineEditable
          value={testCase.description}
          onCommit={(description) => save({ description })}
          canEdit={canEdit}
          placeholder="Agregar una descripción…"
          className="text-[13px] text-fg-muted"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {testCase.tags.map((tag) => (
          <Badge key={tag}>
            {tag}
            {canEdit && (
              <button
                type="button"
                onClick={() => save({ tags: testCase.tags.filter((t) => t !== tag) })}
                className="ml-1 text-fg-muted hover:text-danger"
                aria-label={`Quitar etiqueta ${tag}`}
              >
                <X className="size-2.5" />
              </button>
            )}
          </Badge>
        ))}
        {canEdit && (
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTag.trim()) {
                save({ tags: [...testCase.tags, newTag.trim()] });
                setNewTag("");
              }
            }}
            placeholder="+ etiqueta"
            className="w-16 bg-transparent text-[12px] text-fg-muted placeholder:text-fg-muted focus:outline-none"
          />
        )}

        {canEdit && (
          <div className="ml-auto w-40">
            <Select
              value={testCase.status}
              onChange={(e) => save({ status: e.target.value as TestCaseStatus })}
            >
              <option value="draft">Borrador</option>
              <option value="active">Activo</option>
              <option value="deprecated">Obsoleto</option>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
