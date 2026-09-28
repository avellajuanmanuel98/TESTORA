import type { Tone } from "@/components/ui/StatusPill";

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  active: "Activo",
  archived: "Archivado",
};

export const PROJECT_STATUS_TONE: Record<string, Tone> = {
  active: "success",
  archived: "neutral",
};

export const TEST_CASE_STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  active: "Activo",
  deprecated: "Obsoleto",
};

export const TEST_CASE_STATUS_TONE: Record<string, Tone> = {
  active: "success",
  draft: "neutral",
  deprecated: "warning",
};

export const TEST_RUN_STATUS_LABEL: Record<string, string> = {
  queued: "En cola",
  running: "En curso",
  passed: "Aprobado",
  failed: "Fallido",
  error: "Error",
};

export const TEST_RUN_STATUS_TONE: Record<string, Tone> = {
  queued: "neutral",
  running: "accent",
  passed: "success",
  failed: "danger",
  error: "danger",
};

// StepResult reuses TestResult's status set, plus "skipped" for steps after
// the first failure in the same test case.
export const TEST_RESULT_STATUS_LABEL: Record<string, string> = {
  ...TEST_RUN_STATUS_LABEL,
  skipped: "Omitido",
};

export const TEST_RESULT_STATUS_TONE: Record<string, Tone> = {
  ...TEST_RUN_STATUS_TONE,
  skipped: "neutral",
};
