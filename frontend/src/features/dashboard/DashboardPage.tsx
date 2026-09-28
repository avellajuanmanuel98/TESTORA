import { Link } from "react-router-dom";
import { FlaskConical, FolderGit2, Info } from "lucide-react";

import { Skeleton } from "@/components/ui/Skeleton";
import { StatusDot } from "@/components/ui/StatusPill";
import { useRecentTestCases } from "@/features/dashboard/api";
import { useProjects } from "@/features/projects/api";
import { formatRelativeTime } from "@/lib/format";
import { TEST_CASE_STATUS_LABEL, TEST_CASE_STATUS_TONE } from "@/lib/labels";

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

  const activeProjects = projects?.results.filter((p) => p.status === "active").length ?? 0;
  const statusCounts = { draft: 0, active: 0, deprecated: 0 };
  testCases?.results.forEach((tc) => statusCounts[tc.status]++);

  const recent = testCases?.results.slice(0, 8) ?? [];
  const projectNameById = new Map(projects?.results.map((p) => [p.id, p.name]));

  const isLoading = loadingProjects || loadingTestCases;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-1 text-[18px] font-semibold text-fg-primary">Panel</h1>
      <p className="mb-6 text-[13px] text-fg-muted">Estado general de Testora Internal.</p>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="mb-6 flex rounded-lg border border-border-default bg-surface-raised">
          <StatBlock label="Proyectos activos" value={activeProjects} />
          <StatBlock label="Casos de prueba totales" value={testCases?.count ?? 0} />
          <StatBlock label="Activos" value={statusCounts.active} />
          <StatBlock label="En borrador" value={statusCounts.draft} />
        </div>
      )}

      <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-info-subtle-border bg-info-subtle px-4 py-3 text-[13px] text-fg-primary">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        <p>
          Las métricas de ejecución (tasa de aprobación, pruebas inestables, tendencias) se habilitan cuando el motor de ejecución
          entre en funcionamiento en la próxima fase. Por ahora este panel refleja el estado del inventario de
          pruebas.
        </p>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-fg-primary">Casos de prueba modificados recientemente</h2>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : recent.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-default px-6 py-12 text-center">
          <FlaskConical className="size-5 text-fg-muted" />
          <p className="text-[13px] text-fg-muted">Todavía no hay casos de prueba. Creá un proyecto para empezar.</p>
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
                <StatusDot tone={TEST_CASE_STATUS_TONE[tc.status]}>{TEST_CASE_STATUS_LABEL[tc.status]}</StatusDot>
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
