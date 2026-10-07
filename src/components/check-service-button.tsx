"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, LoaderCircle } from "lucide-react";

export function CheckServiceButton({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function checkService() {
    setIsChecking(true);
    setMessage(null);

    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      const csrf = await csrfResponse.json() as { csrfToken?: string };
      if (!csrfResponse.ok || !csrf.csrfToken) throw new Error("Sessão segura indisponível.");

      const response = await fetch(`/api/central-admin/services/${serviceId}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csrfToken: csrf.csrfToken }),
      });
      const result = await response.json() as { error?: string; status?: string; httpStatus?: number | null; responseTimeMs?: number | null };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível verificar o serviço.");

      const statusLabel = result.status === "online" ? "Online" : result.status === "offline" ? "Indisponível" : "Erro de verificação";
      const details = result.httpStatus ? ` · HTTP ${result.httpStatus}` : "";
      const timing = result.responseTimeMs == null ? "" : ` · ${result.responseTimeMs} ms`;
      setMessage(`${statusLabel}${details}${timing}`);
      router.refresh();
    } catch (checkError) {
      setMessage(checkError instanceof Error ? checkError.message : "Não foi possível verificar o serviço.");
    } finally {
      setIsChecking(false);
    }
  }

  return <button type="button" onClick={checkService} disabled={isChecking} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#cbd7e4] px-2.5 text-xs font-semibold text-[#294052] transition hover:border-[#83a5c4] hover:bg-[#f8fbfd] disabled:cursor-not-allowed disabled:opacity-60" title="Verificar disponibilidade agora">
    {isChecking ? <LoaderCircle className="size-3.5 animate-spin" /> : <Activity className="size-3.5" />}
    {isChecking ? "Verificando..." : "Verificar"}
    {message ? <span className="max-w-[220px] truncate text-[11px] font-medium text-[#60738a]">{message}</span> : null}
  </button>;
}
