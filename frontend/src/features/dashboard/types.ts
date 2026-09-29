export interface NeedsAttentionItem {
  id: number;
  name: string;
  project_name: string;
  passed: number;
  failed: number;
  flaky: boolean;
}

export interface RunSummary {
  id: number;
  project: number;
  project_name: string;
  status: string;
  suite_name: string | null;
  total: number;
  passed: number;
  failed: number;
  started_at: string | null;
  finished_at: string | null;
}

export interface OrgOverview {
  total_results: number;
  passed: number;
  failed: number;
  pass_rate: number | null;
  needs_attention: NeedsAttentionItem[];
  active_runs: RunSummary[];
  recent_runs: RunSummary[];
}
