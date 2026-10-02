import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Paginated } from "@/lib/types";
import type { ProjectDetail, ProjectListItem } from "@/features/projects/types";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<Paginated<ProjectListItem>>("/projects/"),
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => api.get<ProjectDetail>(`/projects/${projectId}/`),
    enabled: Boolean(projectId),
  });
}

interface CreateProjectPayload {
  name: string;
  description?: string;
}

interface UpdateProjectPayload {
  name?: string;
  description?: string;
  status?: "active" | "archived";
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    // The PATCH response only carries what ProjectWriteSerializer exposes
    // (id/name/description/status) — no `members`. Replacing the cached
    // ProjectDetail wholesale would wipe `members` out from under every
    // page that reads it for role checks (canEdit/canDelete throughout the
    // project), crashing on the next render. Merging into the existing
    // cache keeps the instant-update feel without discarding fields this
    // response never had.
    mutationFn: (payload: UpdateProjectPayload) =>
      api.patch<ProjectDetail>(`/projects/${projectId}/`, payload),
    onSuccess: (data) => {
      queryClient.setQueryData<ProjectDetail>(["projects", projectId], (old) =>
        old ? { ...old, ...data } : old
      );
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => api.post<ProjectDetail>("/projects/", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
