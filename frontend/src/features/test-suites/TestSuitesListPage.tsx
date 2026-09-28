import { type FormEvent, useState } from "react";
import { Layers, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SkeletonTableRows } from "@/components/ui/Skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useProjectContext } from "@/features/projects/ProjectContext";
import { useCreateTestSuite, useTestSuites } from "@/features/test-suites/api";
import { ApiError } from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/format";

function NewSuiteModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateTestSuite(projectId);
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    create.mutate(
      { project: Number(projectId), name },
      {
        onSuccess: (suite) => {
          setName("");
          onClose();
          navigate(`/projects/${projectId}/test-suites/${suite.id}`);
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear la suite."),
      }
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva suite"
      description="Agrupa casos de prueba relacionados para ejecutarlos juntos."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="new-suite-form" variant="primary" loading={create.isPending}>
            Crear suite
          </Button>
        </>
      }
    >
      <form id="new-suite-form" onSubmit={handleSubmit}>
        <Input
          label="Nombre"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Regression"
        />
        {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      </form>
    </Modal>
  );
}

export function TestSuitesListPage() {
  const project = useProjectContext();
  const projectId = project.id.toString();
  const { data, isLoading } = useTestSuites(projectId);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-fg-primary">Suites</h1>
          <p className="mt-0.5 text-[13px] text-fg-muted">
            {isLoading ? "Cargando…" : `${data?.count ?? 0} suites en este proyecto.`}
          </p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus className="size-3.5" />
          Nueva suite
        </Button>
      </div>

      {!isLoading && data?.results.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Sin suites todavía"
          description="Agrupa casos de prueba relacionados (smoke, regresión, un módulo específico) para ejecutarlos como unidad."
          action={
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <Plus className="size-3.5" />
              Nueva suite
            </Button>
          }
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Nombre</TH>
              <TH>Casos de prueba</TH>
              <TH>Actualizado</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && <SkeletonTableRows rows={4} cols={3} />}
            {data?.results.map((suite) => (
              <TR key={suite.id} clickable onClick={() => navigate(`/projects/${projectId}/test-suites/${suite.id}`)}>
                <TD className="font-medium text-fg-primary">{suite.name}</TD>
                <TD className="text-fg-muted">{suite.test_case_count}</TD>
                <TD className="text-fg-muted">{formatRelativeTime(suite.updated_at)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <NewSuiteModal open={modalOpen} onClose={() => setModalOpen(false)} projectId={projectId} />
    </div>
  );
}
