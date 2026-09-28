import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Paginated } from "@/lib/types";
import type { TestSuiteDetail, TestSuiteItem, TestSuiteListItem } from "@/features/test-suites/types";

export function useTestSuites(projectId: string) {
  return useQuery({
    queryKey: ["test-suites", projectId],
    queryFn: () => api.get<Paginated<TestSuiteListItem>>(`/test-suites/?project=${projectId}`),
  });
}

export function useTestSuite(suiteId: string | undefined) {
  return useQuery({
    queryKey: ["test-suites", "detail", suiteId],
    queryFn: () => api.get<TestSuiteDetail>(`/test-suites/${suiteId}/`),
    enabled: Boolean(suiteId),
  });
}

interface CreateSuitePayload {
  project: number;
  name: string;
  description?: string;
}

export function useCreateTestSuite(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSuitePayload) => api.post<TestSuiteDetail>("/test-suites/", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["test-suites", projectId] }),
  });
}

function invalidateSuite(queryClient: ReturnType<typeof useQueryClient>, suiteId: string, projectId: string) {
  queryClient.invalidateQueries({ queryKey: ["test-suites", "detail", suiteId] });
  queryClient.invalidateQueries({ queryKey: ["test-suites", projectId] });
}

export function useAddSuiteItem(suiteId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (testCaseId: number) =>
      api.post<TestSuiteItem>("/test-suite-items/", { suite: Number(suiteId), test_case: testCaseId }),
    onSuccess: () => invalidateSuite(queryClient, suiteId, projectId),
  });
}

export function useRemoveSuiteItem(suiteId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => api.delete(`/test-suite-items/${itemId}/`),
    onSuccess: () => invalidateSuite(queryClient, suiteId, projectId),
  });
}

export function useReorderSuiteItems(suiteId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: number[]) =>
      api.post<TestSuiteItem[]>(`/test-suites/${suiteId}/reorder-items/`, { item_ids: itemIds }),
    onSuccess: () => invalidateSuite(queryClient, suiteId, projectId),
  });
}
