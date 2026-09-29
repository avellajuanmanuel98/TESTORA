export interface FlakyTest {
  id: number;
  name: string;
  passed: number;
  failed: number;
}

export interface TopFailingTest {
  id: number;
  name: string;
  failed: number;
}

export interface SuiteDuration {
  suite_id: number;
  suite_name: string;
  avg_duration_ms: number | null;
  run_count: number;
}

export interface ProjectReport {
  total_results: number;
  passed: number;
  failed: number;
  pass_rate: number | null;
  flaky_tests: FlakyTest[];
  top_failing: TopFailingTest[];
  duration_by_suite: SuiteDuration[];
}
