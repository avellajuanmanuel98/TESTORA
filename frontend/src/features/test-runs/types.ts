export type TestRunStatus = "queued" | "running" | "passed" | "failed" | "error";
export type TestResultStatus = "queued" | "running" | "passed" | "failed" | "error" | "skipped";

export interface Evidence {
  id: number;
  type: "screenshot" | "html" | "log";
  file: string;
  created_at: string;
}

export interface StepResult {
  id: number;
  order: number;
  action_type: string;
  status: TestResultStatus;
  duration_ms: number | null;
  error_message: string;
  selector_snapshot: string;
  evidence: Evidence[];
}

export interface TestResult {
  id: number;
  test_case: number;
  test_case_name: string;
  status: TestResultStatus;
  duration_ms: number | null;
  error_type: string;
  error_message: string;
  started_at: string | null;
  finished_at: string | null;
  step_results: StepResult[];
}

export interface TestRunListItem {
  id: number;
  project: number;
  environment: number;
  environment_name: string;
  suite: number | null;
  suite_name: string | null;
  status: TestRunStatus;
  triggered_by: number | null;
  triggered_by_name: string | null;
  total: number;
  passed: number;
  failed: number;
  running: number;
  queued: number;
  skipped: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface TestRunDetail extends TestRunListItem {
  test_results: TestResult[];
}
