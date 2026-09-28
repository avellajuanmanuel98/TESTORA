import { type KeyboardEvent, useState } from "react";
import { X } from "lucide-react";

import { Badge, StatusPill, type Tone } from "@/components/ui/StatusPill";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/toast-store";
import { useUpdateTestCase } from "@/features/test-cases/api";
import type { TestCaseDetail, TestCaseStatus } from "@/features/test-cases/types";
import { ApiError } from "@/lib/api-client";

const STATUS_TONE: Record<TestCaseStatus, Tone> = {
  active: "success",
  draft: "neutral",
  deprecated: "warning",
};

function InlineEditable({
  value,
  onCommit,
  className,
  placeholder,
  canEdit,
}: {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  placeholder?: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!canEdit) {
    return <span className={className}>{value || <span className="text-fg-muted">{placeholder}</span>}</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={`${className} rounded px-1 -mx-1 text-left hover:bg-surface-sunken`}
      >
        {value || <span className="text-fg-muted">{placeholder}</span>}
      </button>
    );
  }

  function commit() {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") commit();
    if (event.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`${className} -mx-1 rounded border border-accent bg-surface px-1 outline-none`}
    />
  );
}

export function TestCaseHeader({
  testCase,
  canEdit,
  projectId,
}: {
  testCase: TestCaseDetail;
  canEdit: boolean;
  projectId: string;
}) {
  const update = useUpdateTestCase(testCase.id.toString(), projectId);
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
        <StatusPill tone={STATUS_TONE[testCase.status]}>{testCase.status}</StatusPill>
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
                aria-label={`Quitar tag ${tag}`}
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
            placeholder="+ tag"
            className="w-16 bg-transparent text-[12px] text-fg-muted placeholder:text-fg-muted focus:outline-none"
          />
        )}

        {canEdit && (
          <div className="ml-auto w-40">
            <Select
              value={testCase.status}
              onChange={(e) => save({ status: e.target.value as TestCaseStatus })}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="deprecated">Deprecated</option>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
