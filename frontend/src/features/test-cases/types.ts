export type TestCaseStatus = "draft" | "active" | "deprecated";

export interface TestCaseListItem {
  id: number;
  name: string;
  description: string;
  tags: string[];
  status: TestCaseStatus;
  step_count: number;
  updated_at: string;
}

export interface TestStep {
  id: number;
  order: number;
  action_type: string;
  action_label: string;
  category: string;
  params: Record<string, string>;
  summary: string;
  timeout_ms: number;
  screenshot_on_fail: boolean;
  enabled: boolean;
  note: string;
  updated_at: string;
}

export interface TestCaseDetail extends TestCaseListItem {
  steps: TestStep[];
}

export interface ActionParamDefinition {
  key: string;
  label: string;
  type: "selector" | "text" | "url" | "number" | "boolean" | "select";
  required: boolean;
  placeholder: string;
  help_text: string;
  choices: [string, string][];
}

export interface ActionDefinition {
  key: string;
  label: string;
  category: string;
  params: ActionParamDefinition[];
}
