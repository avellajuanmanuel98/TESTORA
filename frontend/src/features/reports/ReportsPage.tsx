import { AlertTriangle, Clock, TrendingDown } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useProjectContext } from "@/features/projects/ProjectContext";
import { useProjectReport } from "@/features/reports/api";

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 border-r border-border-default px-6 py-4 last:border-r-0">
      <span className="text-[22px] font-semibold leading-none text-fg-primary">{value}</span>
      <span className="text-[12px] text-fg-muted">{label}</span>
    </div>
  );
}

export function ReportsPage() {
  const project = useProjectContext();
  const projectId = project.id.toString();
  const { data, isLoading } = useProjectReport(projectId);

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-5">
        <h1 className="text-[15px] font-semibold text-fg-primary">Reportes</h1>
        <p className="mt-0.5 text-[13px] text-fg-muted">
          Tasa de aprobación, pruebas inestables y duración de ejecuciones en este proyecto.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !data || data.total_results === 0 ? (
        <EmptyState
          icon={TrendingDown}
          title="Todavía no hay datos para reportar"
          description="Los reportes se completan a medida que se ejecutan pruebas en este proyecto — andá a Ejecuciones para correr la primera."
        />
      ) : (
        <>
          <div className="mb-6 flex rounded-lg border border-border-default bg-surface-raised">
            <StatBlock label="Tasa de aprobación" value={`${data.pass_rate}%`} />
            <StatBlock label="Resultados totales" value={data.total_results} />
            <StatBlock label="Aprobados" value={data.passed} />
            <StatBlock label="Fallidos" value={data.failed} />
          </div>

          <div className="mb-3 flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-warning" aria-hidden />
            <h2 className="text-[13px] font-semibold text-fg-primary">Pruebas inestables</h2>
          </div>
          {data.flaky_tests.length === 0 ? (
            <p className="mb-6 text-[13px] text-fg-muted">
              Ninguna prueba mostró resultados mixtos (aprobado y fallido) en el historial reciente.
            </p>
          ) : (
            <div className="mb-6">
              <Table>
                <THead>
                  <tr>
                    <TH>Caso de prueba</TH>
                    <TH>Aprobados</TH>
                    <TH>Fallidos</TH>
                  </tr>
                </THead>
                <TBody>
                  {data.flaky_tests.map((t) => (
                    <TR key={t.id}>
                      <TD className="font-medium text-fg-primary">{t.name}</TD>
                      <TD className="font-mono text-success">{t.passed}</TD>
                      <TD className="font-mono text-danger">{t.failed}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}

          <h2 className="mb-3 text-[13px] font-semibold text-fg-primary">Casos que más fallan</h2>
          {data.top_failing.length === 0 ? (
            <p className="mb-6 text-[13px] text-fg-muted">Ningún caso de prueba falló en el historial reciente.</p>
          ) : (
            <div className="mb-6">
              <Table>
                <THead>
                  <tr>
                    <TH>Caso de prueba</TH>
                    <TH>Fallos</TH>
                  </tr>
                </THead>
                <TBody>
                  {data.top_failing.map((t) => (
                    <TR key={t.id}>
                      <TD className="font-medium text-fg-primary">{t.name}</TD>
                      <TD className="font-mono text-danger">{t.failed}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}

          <div className="mb-3 flex items-center gap-1.5">
            <Clock className="size-3.5 text-fg-muted" aria-hidden />
            <h2 className="text-[13px] font-semibold text-fg-primary">Duración promedio por suite</h2>
          </div>
          {data.duration_by_suite.length === 0 ? (
            <p className="text-[13px] text-fg-muted">Todavía no hay ejecuciones de suites completas.</p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Suite</TH>
                  <TH>Duración promedio</TH>
                  <TH>Ejecuciones</TH>
                </tr>
              </THead>
              <TBody>
                {data.duration_by_suite.map((s) => (
                  <TR key={s.suite_id}>
                    <TD className="font-medium text-fg-primary">{s.suite_name}</TD>
                    <TD className="font-mono text-fg-muted">{formatDuration(s.avg_duration_ms)}</TD>
                    <TD className="text-fg-muted">{s.run_count}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
