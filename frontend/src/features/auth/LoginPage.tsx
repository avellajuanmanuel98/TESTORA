import { type FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TerminalSquare } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLogin } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { ApiError } from "@/lib/api-client";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
  const login = useLogin();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    login.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          setSession(data);
          navigate(from, { replace: true });
        },
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión.");
        },
      }
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-sunken px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-fg-primary text-surface">
            <TerminalSquare className="size-5" aria-hidden />
          </div>
          <p className="text-[15px] font-semibold text-fg-primary">Testora</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-border-default bg-surface-raised p-6 shadow-panel"
        >
          <div>
            <h1 className="text-[15px] font-semibold text-fg-primary">Iniciar sesión</h1>
            <p className="mt-0.5 text-[13px] text-fg-muted">Accede con tu cuenta de Testora Internal.</p>
          </div>

          <Input
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@testora.dev"
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div className="rounded-md border border-danger-subtle-border bg-danger-subtle px-3 py-2 text-[13px] text-danger">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" size="md" loading={login.isPending} className="mt-1 justify-center">
            Iniciar sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
