import { Outlet, useParams } from "react-router-dom";

import { ProjectRail } from "@/components/layout/ProjectRail";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import { useProject } from "@/features/projects/api";
import { ProjectContext } from "@/features/projects/ProjectContext";

export function ProjectWorkspaceLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading } = useProject(projectId);

  if (isLoading || !project) {
    return (
      <div className="flex h-[calc(100vh-3rem)]">
        <div className="w-48 shrink-0 border-r border-border-default px-2 py-4">
          <Skeleton className="mb-2 h-7 w-full" />
          <Skeleton className="mb-2 h-7 w-full" />
          <Skeleton className="h-7 w-full" />
        </div>
        <div className="flex-1 px-6 py-8">
          <Skeleton className="h-6 w-48" />
        </div>
      </div>
    );
  }

  return (
    <ProjectContext.Provider value={project}>
      <div className="flex h-[calc(100vh-3rem)] flex-col">
        <div className="flex items-center gap-3 border-b border-border-default px-6 py-3">
          <Breadcrumb items={[{ label: "Projects", to: "/projects" }, { label: project.name }]} />
          <StatusPill tone={project.status === "active" ? "success" : "neutral"} dot={false}>
            {project.status === "active" ? "Active" : "Archived"}
          </StatusPill>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <ProjectRail projectId={project.id.toString()} />
          <div className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </ProjectContext.Provider>
  );
}
