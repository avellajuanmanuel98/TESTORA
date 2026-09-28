import { createContext, useContext } from "react";

import type { ProjectDetail } from "@/features/projects/types";

export const ProjectContext = createContext<ProjectDetail | null>(null);

export function useProjectContext(): ProjectDetail {
  const project = useContext(ProjectContext);
  if (!project) {
    throw new Error("useProjectContext must be used within a project workspace route.");
  }
  return project;
}
