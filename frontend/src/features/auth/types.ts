export interface Organization {
  id: number;
  name: string;
  slug: string;
}

export interface SessionUser {
  id: number;
  email: string;
  full_name: string;
  organization: Organization | null;
  organization_role: "owner" | "admin" | "member" | null;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: SessionUser;
}
