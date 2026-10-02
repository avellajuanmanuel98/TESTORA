import { Link } from "react-router-dom";
import { AlertTriangle, FlaskConical, FolderGit2, Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/Skeleton";
import { StatusDot, StatusPill } from "@/components/ui/StatusPill";
import { useOrgOverview, useRecentTestCases } from "@/features/dashboard/api";
import { useProjects } from "@/features/projects/api";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { TEST_CASE_STATUS_LABEL, TEST_CASE_STATUS_TONE, TEST_RUN_STATUS_LABEL, TEST_RUN_STATUS_TONE } from "@/lib/labels";

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 border-r border-border-default px-6 py-4 last:border-r-0">
      <span className="text-[22px] font-semibold leading-none text-fg-primary">{value}</span>
      <span className="text-[12px] text-fg-muted">{label}</span>
    </div>
  );
}

export function DashboardPage() {
  const { data: projects, isLoading: loadingProjects } = useProjects();
  const { data: testCases, isLoading: loadingTestCases } = useRecentTestCases();
  const { data: overview, isLoading: loadingOverview } = useOrgOverview();

  const activeProjects = projects?.results.filter((p) => p.status === "active").length ?? 0;
  const recent = testCases?.results.slice(0, 8) ?? [];
  const projectNameById = new Map(projects?.results.map((p) => [p.id, p.name]));

  const isLoading = loadingProjects || loadingTestCases;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-1 text-[18px] font-semibold text-fg-primary">Panel</h1>
      <p className="mb-6 text-[13px] text-fg-muted">Estado general de Assuria Internal.</p>

      {loadingOverview ? (
        <Skeleton className="mb-6 h-24 w-full" />
      ) : (
        <div className="mb-6 flex rounded-lg border border-border-default bg-surface-raised">
          <StatBlock label="Tasa de aprobación" value={overview?.pass_rate !== null && overview?.pass_rate !== undefined ? `${overview.pass_rate}%` : "—"} />
          <StatBlock label="Proyectos activos" value={activeProjects} />
          <StatBlock label="Ejecuciones activas" value={overview?.active_runs.length ?? 0} />
          <StatBlock label="Casos de prueba totales" value={testCases?.count ?? 0} />
        </div>
      )}

      {(overview?.active_runs.length ?? 0) > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-1.5">
            <Loader2 className="size-3.5 animate-spin text-accent" aria-hidden />
            <h2 className="text-[13px] font-semibold text-fg-primary">Ejecuciones activas</h2>
          </div>
          <div className="flex flex-col divide-y divide-border-default rounded-lg border border-border-default bg-surface-raised">
            {overview!.active_runs.map((run) => (
              <Link
                key={run.id}
                to={`/projects/${run.project}/test-runs/${run.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-sunken"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <StatusDot tone={TEST_RUN_STATUS_TONE[run.status]} live>
                    {TEST_RUN_STATUS_LABEL[run.status]}
                  </StatusDot>
                  <span className="truncate text-[13px] text-fg-primary">
                    {run.suite_name ?? "Caso de prueba individual"}
                  </span>
                  <span className="text-[12px] text-fg-muted">· {run.project_name}</span>
                </div>
                <span className="shrink-0 font-mono text-[12px] text-fg-muted">
                  {run.passed}/{run.total} aprobados
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {(overview?.needs_attention.length ?? 0) > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-warning" aria-hidden />
            <h2 className="text-[13px] font-semibold text-fg-primary">Necesita atención</h2>
          </div>
          <div className="flex flex-col divide-y divide-border-default rounded-lg border border-border-default bg-surface-raised">
            {overview!.needs_attention.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="truncate text-[13px] font-medium text-fg-primary">{item.name}</span>
                  <span className="text-[12px] text-fg-muted">· {item.project_name}</span>
                  {item.flaky && (
                    <span className="rounded bg-warning-subtle px-1.5 py-0.5 text-[11px] font-medium text-warning">
                      inestable
                    </span>
                  )}
                </div>
                <span className="shrink-0 font-mono text-[12px] text-danger">{item.failed} fallos</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(overview?.recent_runs.length ?? 0) > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-[13px] font-semibold text-fg-primary">Ejecuciones recientes</h2>
          <div className="flex flex-col divide-y divide-border-default rounded-lg border border-border-default bg-surface-raised">
            {overview!.recent_runs.map((run) => (
              <Link
                key={run.id}
                to={`/projects/${run.project}/test-runs/${run.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-sunken"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <StatusPill tone={TEST_RUN_STATUS_TONE[run.status]}>{TEST_RUN_STATUS_LABEL[run.status]}</StatusPill>
                  <span className="truncate text-[13px] text-fg-primary">
                    {run.suite_name ?? "Caso de prueba individual"}
                  </span>
                  <span className="text-[12px] text-fg-muted">· {run.project_name}</span>
                </div>
                <span className="shrink-0 text-[12px] text-fg-muted">
                  {run.finished_at ? formatDateTime(run.finished_at) : "—"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-fg-primary">Casos de prueba modificados recientemente</h2>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : recent.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-default px-6 py-12 text-center">
          <FlaskConical className="size-5 text-fg-muted" />
          <p className="text-[13px] text-fg-muted">Todavía no hay casos de prueba. Crea un proyecto para empezar.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border-default rounded-lg border border-border-default bg-surface-raised">
          {recent.map((tc) => (
            <Link
              key={tc.id}
              to={`/projects/${tc.project}/test-cases/${tc.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-sunken"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <FolderGit2 className="size-3.5 shrink-0 text-fg-muted" />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-fg-primary">{tc.name}</div>
                  <div className="text-[12px] text-fg-muted">{projectNameById.get(tc.project) ?? "—"}</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusDot tone={TEST_CASE_STATUS_TONE[tc.status]} live={tc.status === "active"}>
                  {TEST_CASE_STATUS_LABEL[tc.status]}
                </StatusDot>
                <span className="w-20 text-right text-[12px] text-fg-muted">
                  {formatRelativeTime(tc.updated_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
