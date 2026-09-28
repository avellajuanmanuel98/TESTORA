import type { TestCaseStatus } from "@/features/test-cases/types";

export interface TestSuiteListItem {
  id: number;
  name: string;
  description: string;
  test_case_count: number;
  created_at: string;
  updated_at: string;
}

export interface TestSuiteItem {
  id: number;
  test_case: number;
  test_case_name: string;
  test_case_status: TestCaseStatus;
  order: number;
}

export interface TestSuiteDetail extends TestSuiteListItem {
  items: TestSuiteItem[];
}
