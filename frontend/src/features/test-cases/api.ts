import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Paginated } from "@/lib/types";
import type {
  ActionDefinition,
  RecordingSession,
  TestCaseDetail,
  TestCaseListItem,
  TestCaseStatus,
  TestStep,
} from "@/features/test-cases/types";

export function useActions() {
  return useQuery({
    queryKey: ["actions"],
    queryFn: () => api.get<ActionDefinition[]>("/actions/"),
    staleTime: Infinity,
  });
}

export function useTestCases(projectId: string, search?: string) {
  return useQuery({
    queryKey: ["test-cases", projectId, search ?? ""],
    queryFn: () => {
      const params = new URLSearchParams({ project: projectId });
      if (search) params.set("search", search);
      return api.get<Paginated<TestCaseListItem>>(`/test-cases/?${params}`);
    },
  });
}

export function useTestCase(testCaseId: string | undefined, live = false) {
  return useQuery({
    queryKey: ["test-cases", "detail", testCaseId],
    queryFn: () => api.get<TestCaseDetail>(`/test-cases/${testCaseId}/`),
    enabled: Boolean(testCaseId),
    // While a recording is in progress, poll fast so new steps appear as
    // they're captured instead of waiting for a manual refresh.
    refetchInterval: live ? 1500 : false,
  });
}

interface CreateTestCasePayload {
  project: number;
  name: string;
  description?: string;
}

export function useCreateTestCase(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTestCasePayload) => api.post<TestCaseDetail>("/test-cases/", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["test-cases", projectId] }),
  });
}

interface UpdateTestCasePayload {
  name?: string;
  description?: string;
  status?: TestCaseStatus;
  tags?: string[];
}

export function useUpdateTestCase(testCaseId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTestCasePayload) => api.patch<TestCaseDetail>(`/test-cases/${testCaseId}/`, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(["test-cases", "detail", testCaseId], data);
      queryClient.invalidateQueries({ queryKey: ["test-cases", projectId] });
    },
  });
}

function invalidateTestCase(queryClient: ReturnType<typeof useQueryClient>, testCaseId: string) {
  queryClient.invalidateQueries({ queryKey: ["test-cases", "detail", testCaseId] });
}

export function useDeleteTestCase(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (testCaseId: number) => api.delete(`/test-cases/${testCaseId}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["test-cases", projectId] }),
  });
}

interface CreateStepPayload {
  test_case: number;
  action_type: string;
  params: Record<string, string>;
}

export function useCreateStep(testCaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStepPayload) => api.post<TestStep>("/test-steps/", payload),
    onSuccess: () => invalidateTestCase(queryClient, testCaseId),
  });
}

interface UpdateStepPayload {
  id: number;
  params?: Record<string, string>;
  enabled?: boolean;
  timeout_ms?: number;
  screenshot_on_fail?: boolean;
  note?: string;
}

export function useUpdateStep(testCaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateStepPayload) => api.patch<TestStep>(`/test-steps/${id}/`, payload),
    onSuccess: () => invalidateTestCase(queryClient, testCaseId),
  });
}

export function useDeleteStep(testCaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stepId: number) => api.delete(`/test-steps/${stepId}/`),
    onSuccess: () => invalidateTestCase(queryClient, testCaseId),
  });
}

export function useDuplicateStep(testCaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stepId: number) => api.post<TestStep>(`/test-steps/${stepId}/duplicate/`),
    onSuccess: () => invalidateTestCase(queryClient, testCaseId),
  });
}

export function useReorderSteps(testCaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stepIds: number[]) =>
      api.post<TestStep[]>(`/test-cases/${testCaseId}/reorder-steps/`, { step_ids: stepIds }),
    onSuccess: () => invalidateTestCase(queryClient, testCaseId),
  });
}

export function useStartRecording(testCaseId: string) {
  return useMutation({
    mutationFn: (environmentId: number) =>
      api.post<RecordingSession>(`/test-cases/${testCaseId}/start-recording/`, { environment: environmentId }),
  });
}

export function useRecordingSession(sessionId: number | null) {
  return useQuery({
    queryKey: ["recording-sessions", sessionId],
    queryFn: () => api.get<RecordingSession>(`/recording-sessions/${sessionId}/`),
    enabled: sessionId !== null,
    refetchInterval: (query) => (query.state.data?.status === "recording" ? 1000 : false),
  });
}

// Discovers a recording already in progress for this test case that this
// page didn't itself start — a different tab, an earlier visit, or one
// left stuck by a worker restart. Without this, a stale "recording" row is
// invisible (and uncancellable) to anyone who didn't click the button that
// created it.
export function useActiveRecordingSession(testCaseId: string) {
  return useQuery({
    queryKey: ["recording-sessions", "active", testCaseId],
    queryFn: () =>
      api.get<Paginated<RecordingSession>>(
        `/recording-sessions/?test_case=${testCaseId}&status=recording&page_size=1`
      ),
    select: (data) => data.results[0] ?? null,
  });
}

export function useCancelRecording(testCaseId: string) {
  return useMutation({
    mutationFn: () => api.post(`/test-cases/${testCaseId}/cancel-recording/`),
  });
}
