import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { OrgOverview } from "@/features/dashboard/types";
import type { Paginated } from "@/lib/types";
import type { TestCaseListItem } from "@/features/test-cases/types";

export function useRecentTestCases() {
  return useQuery({
    queryKey: ["test-cases", "recent"],
    queryFn: () => api.get<Paginated<TestCaseListItem & { project: number }>>("/test-cases/?page_size=100"),
  });
}

export function useOrgOverview() {
  return useQuery({
    queryKey: ["reports", "overview"],
    queryFn: () => api.get<OrgOverview>("/reports/overview/"),
    refetchInterval: 5000,
  });
}
