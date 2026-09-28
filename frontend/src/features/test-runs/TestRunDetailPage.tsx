import { useState } from "react";
import { FileText } from "lucide-react";
import { useParams } from "react-router-dom";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusDot, StatusPill } from "@/components/ui/StatusPill";
import { useActions } from "@/features/test-cases/api";
import { ACTION_ICONS } from "@/features/test-cases/action-icons";
import { useProjectContext } from "@/features/projects/ProjectContext";
import { useTestRun } from "@/features/test-runs/api";
import { formatDateTime } from "@/lib/format";
import { TEST_RESULT_STATUS_LABEL, TEST_RESULT_STATUS_TONE, TEST_RUN_STATUS_LABEL, TEST_RUN_STATUS_TONE } from "@/lib/labels";
import { cn } from "@/lib/cn";

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function TestRunDetailPage() {
  const { runId, projectId } = useParams<{ runId: string; projectId: string }>();
  const project = useProjectContext();
  const { data: run, isLoading } = useTestRun(runId);
  const { data: actions } = useActions();

  // No default-selection effect: the fallback ("the failing test/step, or
  // else the first/last one") is derived straight from the query data on
  // every render, so a fresh poll never needs a synchronizing effect to
  // catch up, and a run that just failed opens straight to its problem.
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null);

  const defaultResult =
    run?.test_results.find((r) => r.status === "failed" || r.status === "error") ?? run?.test_results[0];
  const resolvedResultId = selectedResultId ?? defaultResult?.id ?? null;
  const selectedResult = run?.test_results.find((r) => r.id === resolvedResultId);

  const defaultStep =
    selectedResult?.step_results.find((s) => s.status === "failed" || s.status === "error") ??
    selectedResult?.step_results[selectedResult.step_results.length - 1];
  const resolvedStepId = selectedResult?.step_results.some((s) => s.id === selectedStepId)
    ? selectedStepId
    : (defaultStep?.id ?? null);
  const selectedStep = selectedResult?.step_results.find((s) => s.id === resolvedStepId);

  const actionsByKey = Object.fromEntries((actions ?? []).map((a) => [a.key, a]));

  if (isLoading || !run) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Skeleton className="mb-4 h-6 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-4">
        <Breadcrumb
          items={[
            { label: project.name, to: `/projects/${projectId}` },
            { label: "Ejecuciones", to: `/projects/${projectId}/test-runs` },
            { label: `Run #${run.id}` },
          ]}
        />
      </div>

      <div className="mb-4 flex items-center justify-between rounded-lg border border-border-default bg-surface-raised px-4 py-3">
        <div className="flex items-center gap-4">
          <StatusPill tone={TEST_RUN_STATUS_TONE[run.status]} live={run.status === "running"}>
            {TEST_RUN_STATUS_LABEL[run.status]}
          </StatusPill>
          <span className="text-[13px] text-fg-muted">{run.suite_name ?? "Caso de prueba individual"}</span>
          <span className="text-[13px] text-fg-muted">· {run.environment_name}</span>
        </div>
        <div className="flex items-center gap-4 text-[13px] text-fg-muted">
          <span className="font-mono text-fg-primary">
            {run.passed}/{run.total} aprobados
          </span>
          {run.failed > 0 && <span className="font-mono text-danger">{run.failed} fallidos</span>}
          <span>{run.started_at ? formatDateTime(run.started_at) : "En cola"}</span>
        </div>
      </div>

      <div className="grid h-[560px] grid-cols-[220px_1fr_320px] overflow-hidden rounded-lg border border-border-default bg-surface-raised">
        {/* Left: test cases in this run */}
        <div className="flex flex-col overflow-y-auto border-r border-border-default">
          {run.test_results.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => {
                setSelectedResultId(result.id);
                setSelectedStepId(null);
              }}
              className={cn(
                "flex flex-col items-start gap-1 border-b border-border-default px-3 py-2.5 text-left transition-colors",
                resolvedResultId === result.id ? "bg-accent-subtle" : "hover:bg-surface-sunken"
              )}
            >
              <span className="truncate text-[13px] font-medium text-fg-primary">{result.test_case_name}</span>
              <StatusDot tone={TEST_RESULT_STATUS_TONE[result.status]} live={result.status === "running"}>
                {TEST_RESULT_STATUS_LABEL[result.status]}
              </StatusDot>
            </button>
          ))}
        </div>

        {/* Center: step timeline for the selected test case */}
        <div className="flex flex-col overflow-y-auto border-r border-border-default">
          {selectedResult?.step_results.map((step) => {
            const Icon = ACTION_ICONS[step.action_type] ?? FileText;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setSelectedStepId(step.id)}
                className={cn(
                  "flex items-center gap-2.5 border-b border-border-default px-3 py-2.5 text-left transition-colors",
                  resolvedStepId === step.id ? "bg-accent-subtle" : "hover:bg-surface-sunken"
                )}
              >
                <span className="w-5 shrink-0 text-right font-mono text-[12px] text-fg-muted">{step.order}</span>
                <Icon className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
                <span className="flex-1 truncate text-[13px] text-fg-primary">
                  {actionsByKey[step.action_type]?.label ?? step.action_type}
                  {step.selector_snapshot && (
                    <span className="ml-1.5 rounded bg-surface-sunken px-1 py-0.5 font-mono text-[11px] text-fg-secondary">
                      {step.selector_snapshot}
                    </span>
                  )}
                </span>
                <StatusDot tone={TEST_RESULT_STATUS_TONE[step.status]} live={step.status === "running"}>
                  {""}
                </StatusDot>
                <span className="w-12 shrink-0 text-right font-mono text-[11px] text-fg-muted">
                  {formatDuration(step.duration_ms)}
                </span>
              </button>
            );
          })}
          {selectedResult && selectedResult.step_results.length === 0 && (
            <p className="p-4 text-[13px] text-fg-muted">Todavía no hay pasos ejecutados.</p>
          )}
        </div>

        {/* Right: evidence for the selected step */}
        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          {!selectedStep ? (
            <p className="text-[13px] text-fg-muted">Selecciona un paso para ver su evidencia.</p>
          ) : (
            <>
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-fg-muted">Estado</h3>
                <StatusDot tone={TEST_RESULT_STATUS_TONE[selectedStep.status]} className="mt-1">
                  {TEST_RESULT_STATUS_LABEL[selectedStep.status]}
                </StatusDot>
              </div>
              {selectedStep.error_message && (
                <div>
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-fg-muted">Error</h3>
                  <p className="mt-1 whitespace-pre-wrap break-words rounded-md bg-danger-subtle px-2.5 py-2 font-mono text-[12px] text-danger">
                    {selectedStep.error_message}
                  </p>
                </div>
              )}
              {selectedStep.evidence.length === 0 ? (
                <p className="text-[13px] text-fg-muted">Este paso no capturó evidencia.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-fg-muted">Evidencia</h3>
                  {selectedStep.evidence.map((evidence) =>
                    evidence.type === "screenshot" ? (
                      <a key={evidence.id} href={evidence.file} target="_blank" rel="noreferrer">
                        <img
                          src={evidence.file}
                          alt="Screenshot del paso"
                          className="w-full rounded-md border border-border-default"
                        />
                      </a>
                    ) : (
                      <a
                        key={evidence.id}
                        href={evidence.file}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-md border border-border-default px-2.5 py-2 text-[13px] text-accent hover:bg-surface-sunken"
                      >
                        <FileText className="size-3.5" aria-hidden />
                        Ver {evidence.type === "html" ? "HTML capturado" : "log"}
                      </a>
                    )
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
