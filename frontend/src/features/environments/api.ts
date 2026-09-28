import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Paginated } from "@/lib/types";
import type { Environment } from "@/features/environments/types";

export function useEnvironments(projectId: string) {
  return useQuery({
    queryKey: ["environments", projectId],
    queryFn: () => api.get<Paginated<Environment>>(`/environments/?project=${projectId}`),
  });
}

interface CreateEnvironmentPayload {
  project: number;
  name: string;
  base_url: string;
  browser?: string;
}

export function useCreateEnvironment(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEnvironmentPayload) => api.post<Environment>("/environments/", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["environments", projectId] }),
  });
}

interface UpsertVariablePayload {
  environment: number;
  key: string;
  value: string;
  is_secret: boolean;
}

export function useCreateVariable(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertVariablePayload) => api.post("/environment-variables/", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["environments", projectId] }),
  });
}

export function useDeleteVariable(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variableId: number) => api.delete(`/environment-variables/${variableId}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["environments", projectId] }),
  });
}

export function useDeleteEnvironment(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (environmentId: number) => api.delete(`/environments/${environmentId}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["environments", projectId] }),
  });
}
