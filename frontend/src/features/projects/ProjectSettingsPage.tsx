import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/toast-store";
import { useCurrentUser } from "@/features/auth/auth-store";
import { useProjectContext } from "@/features/projects/ProjectContext";
import { useUpdateProject } from "@/features/projects/api";
import { ApiError } from "@/lib/api-client";

export function ProjectSettingsPage() {
  const project = useProjectContext();
  const user = useCurrentUser();
  const membership = project.members.find((m) => m.user.id === user?.id);
  const canEdit = membership?.role === "admin";

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus] = useState(project.status);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateProject(project.id.toString());

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    update.mutate(
      { name, description, status },
      {
        onSuccess: () => toast.success("Proyecto actualizado."),
        onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo guardar."),
      }
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <h1 className="mb-1 text-[15px] font-semibold text-fg-primary">Configuración</h1>
      <p className="mb-6 text-[13px] text-fg-muted">
        {canEdit
          ? "Cambios visibles para todo el equipo del proyecto."
          : "Solo un admin del proyecto puede editar esta información."}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
        <Input
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!canEdit}
        />
        <Select
          label="Estado"
          value={status}
          onChange={(e) => setStatus(e.target.value as "active" | "archived")}
          disabled={!canEdit}
        >
          <option value="active">Activo</option>
          <option value="archived">Archivado</option>
        </Select>

        {error && <p className="text-[13px] text-danger">{error}</p>}

        {canEdit && (
          <div>
            <Button type="submit" variant="primary" loading={update.isPending}>
              Guardar cambios
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
