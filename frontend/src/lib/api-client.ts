import { useAuthStore } from "@/features/auth/auth-store";

const API_BASE = "/api";

export class ApiError extends Error {
  status: number;
  errors: unknown;

  constructor(status: number, detail: string, errors: unknown) {
    super(detail);
    this.status = status;
    this.errors = errors;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = useAuthStore.getState().refresh;
  if (!refresh) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        useAuthStore.getState().setAccessToken(data.access);
        return data.access as string;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { access } = useAuthStore.getState();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (access) headers.Authorization = `Bearer ${access}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && !isRetry) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      return apiFetch<T>(path, options, true);
    }
    useAuthStore.getState().clear();
    throw new ApiError(401, "Session expired.", null);
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = payload?.detail ?? "Something went wrong.";
    throw new ApiError(response.status, detail, payload?.errors ?? null);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
