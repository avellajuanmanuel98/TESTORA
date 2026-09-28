export interface EnvironmentVariable {
  id: number;
  key: string;
  value: string;
  is_secret: boolean;
  updated_at: string;
}

export interface Environment {
  id: number;
  name: string;
  base_url: string;
  browser: string;
  browser_config: Record<string, unknown>;
  variables: EnvironmentVariable[];
  created_at: string;
  updated_at: string;
}
