import { type FormEvent, useState } from "react";
import { FlaskConical, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge, StatusPill, type Tone } from "@/components/ui/StatusPill";
import { SkeletonTableRows } from "@/components/ui/Skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useCreateTestCase, useTestCases } from "@/features/test-cases/api";
import { useProjectContext } from "@/features/projects/ProjectContext";
import type { TestCaseStatus } from "@/features/test-cases/types";
import { ApiError } from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/format";

const STATUS_TONE: Record<TestCaseStatus, Tone> = {
  active: "success",
  draft: "neutral",
  deprecated: "warning",
};

const STATUS_LABEL: Record<TestCaseStatus, string> = {
  active: "Active",
  draft: "Draft",
  deprecated: "Deprecated",
};

function NewTestCaseModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateTestCase(projectId);
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    create.mutate(
      { project: Number(projectId), name },
      {
        onSuccess: (testCase) => {
          setName("");
          onClose();
          navigate(`/projects/${projectId}/test-cases/${testCase.id}`);
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear el test case."),
      }
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo test case"
      description="Empezá con un nombre claro; los pasos se arman en el editor."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="new-tc-form" variant="primary" loading={create.isPending}>
            Crear y abrir editor
          </Button>
        </>
      }
    >
      <form id="new-tc-form" onSubmit={handleSubmit}>
        <Input
          label="Nombre"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Login válido"
        />
        {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      </form>
    </Modal>
  );
}

export function TestCasesListPage() {
  const project = useProjectContext();
  const projectId = project.id.toString();
  const { data, isLoading } = useTestCases(projectId);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-fg-primary">Test Cases</h1>
          <p className="mt-0.5 text-[13px] text-fg-muted">
            {isLoading ? "Cargando…" : `${data?.count ?? 0} casos de prueba en este proyecto.`}
          </p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus className="size-3.5" />
          New Test Case
        </Button>
      </div>

      {!isLoading && data?.results.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="Sin test cases todavía"
          description="Creá el primer caso de prueba para empezar a construir tu suite de automatización."
          action={
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <Plus className="size-3.5" />
              New Test Case
            </Button>
          }
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Nombre</TH>
              <TH>Tags</TH>
              <TH>Steps</TH>
              <TH>Estado</TH>
              <TH>Actualizado</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && <SkeletonTableRows rows={5} cols={5} />}
            {data?.results.map((tc) => (
              <TR key={tc.id} clickable onClick={() => navigate(`/projects/${projectId}/test-cases/${tc.id}`)}>
                <TD className="font-medium text-fg-primary">{tc.name}</TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {tc.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                </TD>
                <TD className="text-fg-muted">{tc.step_count}</TD>
                <TD>
                  <StatusPill tone={STATUS_TONE[tc.status]}>{STATUS_LABEL[tc.status]}</StatusPill>
                </TD>
                <TD className="text-fg-muted">{formatRelativeTime(tc.updated_at)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <NewTestCaseModal open={modalOpen} onClose={() => setModalOpen(false)} projectId={projectId} />
    </div>
  );
}
