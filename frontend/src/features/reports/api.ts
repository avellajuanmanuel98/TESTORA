import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { ProjectReport } from "@/features/reports/types";

export function useProjectReport(projectId: string) {
  return useQuery({
    queryKey: ["reports", "summary", projectId],
    queryFn: () => api.get<ProjectReport>(`/reports/summary/?project=${projectId}`),
  });
}
