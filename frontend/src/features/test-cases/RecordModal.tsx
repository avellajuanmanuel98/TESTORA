import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useEnvironments } from "@/features/environments/api";
import { useStartRecording } from "@/features/test-cases/api";
import { ApiError } from "@/lib/api-client";

interface RecordModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  testCaseId: string;
  onRecordingStarted: (sessionId: number) => void;
}

export function RecordModal({ open, onClose, projectId, testCaseId, onRecordingStarted }: RecordModalProps) {
  const { data: environments } = useEnvironments(projectId);
  const [environmentId, setEnvironmentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const startRecording = useStartRecording(testCaseId);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!environmentId) return;
    setError(null);
    startRecording.mutate(Number(environmentId), {
      onSuccess: (session) => {
        setEnvironmentId("");
        onClose();
        onRecordingStarted(session.id);
      },
      onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo iniciar la grabación."),
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Grabar pasos"
      description="Se abre una ventana de Chrome real en el entorno elegido. Hacé clic, escribí y seleccioná como lo haría un usuario — Assuria va agregando cada acción como un paso. Cerrá la ventana del navegador cuando termines. Revisá los pasos grabados al final: una acción que dispara una navegación inmediata (como enviar un formulario) a veces no llega a capturarse."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="record-modal-form"
            variant="primary"
            loading={startRecording.isPending}
            disabled={!environmentId}
          >
            Iniciar grabación
          </Button>
        </>
      }
    >
      <form id="record-modal-form" onSubmit={handleSubmit}>
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
