import { useMutation } from "@tanstack/react-query";

import { api, ApiError } from "@/lib/api-client";
import type { LoginResponse } from "@/features/auth/types";

interface LoginPayload {
  email: string;
  password: string;
}

export function useLogin() {
  return useMutation<LoginResponse, ApiError, LoginPayload>({
    mutationFn: (payload) => api.post<LoginResponse>("/auth/login/", payload),
  });
}
