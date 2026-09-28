import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useEnvironments } from "@/features/environments/api";
import { useCreateTestRun } from "@/features/test-runs/api";
import { ApiError } from "@/lib/api-client";

interface RunModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** Exactly one of these identifies what this run targets. */
  suiteId?: number;
  testCaseId?: number;
  onRunCreated: (runId: number) => void;
}

export function RunModal({ open, onClose, projectId, suiteId, testCaseId, onRunCreated }: RunModalProps) {
  const { data: environments } = useEnvironments(projectId);
  const [environmentId, setEnvironmentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createRun = useCreateTestRun(projectId);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!environmentId) return;
    setError(null);
    createRun.mutate(
      {
        project: Number(projectId),
        environment: Number(environmentId),
        ...(suiteId ? { suite: suiteId } : {}),
        ...(testCaseId ? { test_case: testCaseId } : {}),
      },
      {
        onSuccess: (run) => {
          setEnvironmentId("");
          onClose();
          onRunCreated(run.id);
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo iniciar la ejecución."),
      }
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ejecutar"
      description="Selecciona el entorno donde se va a correr esta ejecución."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="run-modal-form"
            variant="primary"
            loading={createRun.isPending}
            disabled={!environmentId}
          >
            Ejecutar
          </Button>
        </>
      }
    >
      <form id="run-modal-form" onSubmit={handleSubmit}>
        <Select
          label="Entorno"
          required
          autoFocus
          value={environmentId}
          onChange={(e) => setEnvironmentId(e.target.value)}
        >
          <option value="">Selecciona un entorno…</option>
          {environments?.results.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </Select>
        {environments?.results.length === 0 && (
          <p className="mt-2 text-[13px] text-fg-muted">
            Este proyecto todavía no tiene entornos configurados.
          </p>
        )}
        {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      </form>
    </Modal>
  );
}
