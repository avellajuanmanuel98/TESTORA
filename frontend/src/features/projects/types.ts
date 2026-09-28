import type { SessionUser } from "@/features/auth/types";

export type ProjectStatus = "active" | "archived";

export interface ProjectListItem {
  id: number;
  name: string;
  slug: string;
  description: string;
  status: ProjectStatus;
  test_case_count: number;
  last_activity_at: string | null;
  created_at: string;
}

export interface ProjectMembership {
  id: number;
  user: Pick<SessionUser, "id" | "email" | "full_name">;
  role: "admin" | "qa_manager" | "qa_engineer" | "viewer";
  created_at: string;
}

export interface ProjectDetail extends ProjectListItem {
  members: ProjectMembership[];
}
