import { type FormEvent, useState } from "react";
import { Globe2, KeyRound, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/toast-store";
import { useCreateEnvironment, useCreateVariable, useDeleteVariable, useEnvironments } from "@/features/environments/api";
import type { Environment } from "@/features/environments/types";
import { useProjectContext } from "@/features/projects/ProjectContext";
import { ApiError } from "@/lib/api-client";

function NewEnvironmentModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateEnvironment(projectId);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    create.mutate(
      { project: Number(projectId), name: name.toUpperCase(), base_url: baseUrl },
      {
        onSuccess: () => {
          toast.success(`Entorno ${name.toUpperCase()} creado.`);
          setName("");
          setBaseUrl("");
          onClose();
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear el entorno."),
      }
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo entorno"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="new-env-form" variant="primary" loading={create.isPending}>
            Crear entorno
          </Button>
        </>
      }
    >
      <form id="new-env-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label="Nombre" required placeholder="DEV" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Base URL"
          required
          type="url"
          placeholder="https://dev.example.com"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
        {error && <p className="text-[13px] text-danger">{error}</p>}
      </form>
    </Modal>
  );
}

function NewVariableModal({
  open,
  onClose,
  projectId,
  environmentId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  environmentId: number;
}) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateVariable(projectId);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    create.mutate(
      { environment: environmentId, key, value, is_secret: isSecret },
      {
        onSuccess: () => {
          toast.success(`Variable {{${key.toUpperCase()}}} agregada.`);
          setKey("");
          setValue("");
          setIsSecret(false);
          onClose();
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear la variable."),
      }
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva variable"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="new-var-form" variant="primary" loading={create.isPending}>
            Agregar variable
          </Button>
        </>
      }
    >
      <form id="new-var-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label="Clave" mono required placeholder="API_TOKEN" value={key} onChange={(e) => setKey(e.target.value)} />
        <Input label="Valor" mono required value={value} onChange={(e) => setValue(e.target.value)} />
        <label className="flex items-center gap-2 text-[13px] text-fg-secondary">
          <input
            type="checkbox"
            checked={isSecret}
            onChange={(e) => setIsSecret(e.target.checked)}
            className="size-3.5 accent-accent"
          />
          Es un valor sensible (se ocultará siempre en la interfaz)
        </label>
        {error && <p className="text-[13px] text-danger">{error}</p>}
      </form>
    </Modal>
  );
}

function EnvironmentCard({ environment, projectId }: { environment: Environment; projectId: string }) {
  const [variableModalOpen, setVariableModalOpen] = useState(false);
  const deleteVariable = useDeleteVariable(projectId);

  return (
    <div className="rounded-lg border border-border-default bg-surface-raised">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-surface-sunken text-fg-muted">
            <Globe2 className="size-3.5" aria-hidden />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-fg-primary">{environment.name}</div>
            <div className="font-mono text-[12px] text-fg-muted">{environment.base_url}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setVariableModalOpen(true)}>
          <Plus className="size-3.5" />
          Variable
        </Button>
      </div>

      {environment.variables.length === 0 ? (
        <p className="px-4 py-4 text-[13px] text-fg-muted">Sin variables todavía.</p>
      ) : (
        <div className="divide-y divide-border-default">
          {environment.variables.map((variable) => (
            <div key={variable.id} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2 font-mono text-[13px]">
                <span className="text-fg-muted">{"{{"}</span>
                <span className="font-medium text-fg-primary">{variable.key}</span>
                <span className="text-fg-muted">{"}}"}</span>
                <span className="text-fg-muted">=</span>
                <span className={variable.is_secret ? "text-fg-muted" : "text-fg-secondary"}>{variable.value}</span>
              </div>
              <div className="flex items-center gap-2">
                {variable.is_secret && (
                  <span className="flex items-center gap-1 text-[11px] text-fg-muted">
                    <KeyRound className="size-3" /> secreto
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => deleteVariable.mutate(variable.id)}
                  className="text-fg-muted hover:text-danger"
                  aria-label={`Eliminar ${variable.key}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewVariableModal
        open={variableModalOpen}
        onClose={() => setVariableModalOpen(false)}
        projectId={projectId}
        environmentId={environment.id}
      />
    </div>
  );
}

export function EnvironmentsPage() {
  const project = useProjectContext();
  const projectId = project.id.toString();
  const { data, isLoading } = useEnvironments(projectId);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-fg-primary">Environments</h1>
          <p className="mt-0.5 text-[13px] text-fg-muted">
            DEV, QA, UAT y sus variables. Usalas en los steps como <code className="font-mono">{"{{BASE_URL}}"}</code>.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setModalOpen(true)}>
          <Plus className="size-3.5" />
          New Environment
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {!isLoading && data?.results.length === 0 && (
        <EmptyState
          icon={Globe2}
          title="Sin entornos configurados"
          description="Creá al menos un entorno (DEV, QA, UAT) para poder ejecutar pruebas más adelante."
          action={
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <Plus className="size-3.5" />
              New Environment
            </Button>
          }
        />
      )}

      <div className="flex flex-col gap-4">
        {data?.results.map((env) => (
          <EnvironmentCard key={env.id} environment={env} projectId={projectId} />
        ))}
      </div>

      <NewEnvironmentModal open={modalOpen} onClose={() => setModalOpen(false)} projectId={projectId} />
    </div>
  );
}
