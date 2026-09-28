import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Paginated } from "@/lib/types";
import type {
  ActionDefinition,
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

export function useTestCases(projectId: string) {
  return useQuery({
    queryKey: ["test-cases", projectId],
    queryFn: () => api.get<Paginated<TestCaseListItem>>(`/test-cases/?project=${projectId}`),
  });
}

export function useTestCase(testCaseId: string | undefined) {
  return useQuery({
    queryKey: ["test-cases", "detail", testCaseId],
    queryFn: () => api.get<TestCaseDetail>(`/test-cases/${testCaseId}/`),
    enabled: Boolean(testCaseId),
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
