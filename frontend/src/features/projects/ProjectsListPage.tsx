import { type FormEvent, useState } from "react";
import { FolderGit2, Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import { toast } from "@/components/ui/toast-store";
import { useCurrentUser } from "@/features/auth/auth-store";
import { useCreateProject, useProjects } from "@/features/projects/api";
import { formatRelativeTime } from "@/lib/format";
import { ApiError } from "@/lib/api-client";
import { PROJECT_STATUS_LABEL } from "@/lib/labels";

function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createProject = useCreateProject();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    createProject.mutate(
      { name, description },
      {
        onSuccess: () => {
          toast.success(`Proyecto “${name}” creado.`);
          setName("");
          setDescription("");
          onClose();
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear el proyecto."),
      }
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo proyecto"
      description="Crea un espacio de trabajo para un producto o iniciativa de QA."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="new-project-form" variant="primary" loading={createProject.isPending}>
            Crear proyecto
          </Button>
        </>
      }
    >
      <form id="new-project-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Nombre"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Gencell Pharma"
        />
        <Input
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Qué producto o proceso cubre este proyecto"
        />
        {error && <p className="text-[13px] text-danger">{error}</p>}
      </form>
    </Modal>
  );
}

export function ProjectsListPage() {
  const { data, isLoading } = useProjects();
  const user = useCurrentUser();
  const [modalOpen, setModalOpen] = useState(false);
  const canCreate = user?.organization_role === "owner" || user?.organization_role === "admin";

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-fg-primary">Proyectos</h1>
          <p className="mt-0.5 text-[13px] text-fg-muted">
            Espacios de trabajo de automatización de pruebas de Assuria Internal.
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Plus className="size-3.5" />
            Nuevo proyecto
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col divide-y divide-border-default rounded-lg border border-border-default">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-72" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && data?.results.length === 0 && (
        <EmptyState
          icon={FolderGit2}
          title="Todavía no hay proyectos"
          description="Crea el primer proyecto para empezar a organizar casos de prueba, entornos y ejecuciones."
          action={
            canCreate && (
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                <Plus className="size-3.5" />
                Nuevo proyecto
              </Button>
            )
          }
        />
      )}

      {!isLoading && data && data.results.length > 0 && (
        <div className="flex flex-col divide-y divide-border-default rounded-lg border border-border-default bg-surface-raised">
          {data.results.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="flex items-center justify-between gap-6 px-4 py-4 transition-colors hover:bg-surface-sunken"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-fg-primary">{project.name}</span>
                  {project.status !== "active" && (
                    <StatusPill tone="neutral">{PROJECT_STATUS_LABEL[project.status]}</StatusPill>
                  )}
                </div>
                {project.description && (
                  <p className="truncate text-[13px] text-fg-muted">{project.description}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-6 text-[13px] text-fg-muted">
                <div className="text-right">
                  <div className="font-medium text-fg-primary">{project.test_case_count}</div>
                  <div className="text-[12px]">pruebas</div>
                </div>
                <div className="w-28 text-right text-[12px]">
                  {formatRelativeTime(project.last_activity_at)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
