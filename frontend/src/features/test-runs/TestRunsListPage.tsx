import { PlayCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTableRows } from "@/components/ui/Skeleton";
import { StatusDot } from "@/components/ui/StatusPill";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useProjectContext } from "@/features/projects/ProjectContext";
import { useTestRuns } from "@/features/test-runs/api";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { TEST_RUN_STATUS_LABEL, TEST_RUN_STATUS_TONE } from "@/lib/labels";
import { cn } from "@/lib/cn";

const STATUS_FILTERS = ["queued", "running", "passed", "failed", "error"] as const;

export function TestRunsListPage() {
  const project = useProjectContext();
  const projectId = project.id.toString();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const { data, isLoading } = useTestRuns(projectId, status || undefined);
  const navigate = useNavigate();

  function setStatus(next: string) {
    setSearchParams(next ? { status: next } : {}, { replace: true });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-5">
        <h1 className="text-[15px] font-semibold text-fg-primary">Ejecuciones</h1>
        <p className="mt-0.5 text-[13px] text-fg-muted">
          {isLoading
            ? "Cargando…"
            : data?.count === 1
              ? `1 ejecución${status ? " encontrada" : " registrada en este proyecto"}.`
              : `${data?.count ?? 0} ejecuciones${status ? " encontradas" : " registradas en este proyecto"}.`}
        </p>
      </div>

      <div className="mb-4 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setStatus("")}
          className={cn(
            "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
            status === "" ? "bg-accent-subtle text-accent" : "text-fg-muted hover:bg-surface-sunken hover:text-fg-primary"
          )}
        >
          Todas
        </button>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
              status === s ? "bg-accent-subtle text-accent" : "text-fg-muted hover:bg-surface-sunken hover:text-fg-primary"
            )}
          >
            {TEST_RUN_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {!isLoading && data?.results.length === 0 && status ? (
        <EmptyState
          icon={PlayCircle}
          title="Sin ejecuciones con este estado"
          description={`Ninguna ejecución tiene el estado "${TEST_RUN_STATUS_LABEL[status] ?? status}".`}
        />
      ) : !isLoading && data?.results.length === 0 ? (
        <EmptyState
          icon={PlayCircle}
          title="Todavía no hay ejecuciones"
          description="Inicia una ejecución desde un caso de prueba o una suite para ver acá su progreso y resultados."
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Run</TH>
              <TH>Suite / Caso</TH>
              <TH>Entorno</TH>
              <TH>Estado</TH>
              <TH>Resultados</TH>
              <TH>Disparado por</TH>
              <TH>Iniciado</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && <SkeletonTableRows rows={5} cols={7} />}
            {data?.results.map((run) => (
              <TR key={run.id} clickable onClick={() => navigate(`/projects/${projectId}/test-runs/${run.id}`)}>
                <TD className="font-mono text-fg-muted">#{run.id}</TD>
                <TD className="font-medium text-fg-primary">
                  {run.suite_name ?? <span className="font-normal text-fg-muted">Caso de prueba individual</span>}
                </TD>
                <TD className="text-fg-muted">{run.environment_name}</TD>
                <TD>
                  <StatusDot tone={TEST_RUN_STATUS_TONE[run.status]} live={run.status === "running"}>
                    {TEST_RUN_STATUS_LABEL[run.status]}
                  </StatusDot>
                </TD>
                <TD className="font-mono text-fg-muted">
                  {run.passed}/{run.total}
                </TD>
                <TD className="text-fg-muted">{run.triggered_by_name ?? "—"}</TD>
                <TD className="text-fg-muted" title={run.started_at ? formatDateTime(run.started_at) : undefined}>
                  {run.started_at ? formatRelativeTime(run.started_at) : "En cola"}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
