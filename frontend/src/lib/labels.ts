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
