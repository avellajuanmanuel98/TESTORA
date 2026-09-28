import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Paginated } from "@/lib/types";
import type { TestRunDetail, TestRunListItem, TestRunStatus } from "@/features/test-runs/types";

const ACTIVE_STATUSES: TestRunStatus[] = ["queued", "running"];

// Polling, not WebSockets, for run progress (see architecture notes) — the
// interval only stays active while something in view is actually in
// flight, so a finished run stops refetching on its own.
export function useTestRuns(projectId: string) {
  return useQuery({
    queryKey: ["test-runs", projectId],
    queryFn: () => api.get<Paginated<TestRunListItem>>(`/test-runs/?project=${projectId}`),
    refetchInterval: (query) => {
      const hasActive = query.state.data?.results.some((run) => ACTIVE_STATUSES.includes(run.status));
      return hasActive ? 2000 : false;
    },
  });
}

export function useTestRun(runId: string | undefined) {
  return useQuery({
    queryKey: ["test-runs", "detail", runId],
    queryFn: () => api.get<TestRunDetail>(`/test-runs/${runId}/`),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_STATUSES.includes(status) ? 1500 : false;
    },
  });
}

interface CreateRunPayload {
  project: number;
  environment: number;
  suite?: number;
  test_case?: number;
}

export function useCreateTestRun(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRunPayload) => api.post<TestRunListItem>("/test-runs/", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["test-runs", projectId] }),
  });
}
