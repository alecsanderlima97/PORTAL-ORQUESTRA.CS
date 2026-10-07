"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, LoaderCircle } from "lucide-react";

export function SyncServiceButton({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function syncService() {
    setIsSyncing(true);
    setMessage(null);
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      const csrf = await csrfResponse.json() as { csrfToken?: string };
      if (!csrfResponse.ok || !csrf.csrfToken) throw new Error("Sessão segura indisponível.");
      const response = await fetch(`/api/central-admin/services/${serviceId}/sync`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csrfToken: csrf.csrfToken }) });
      const result = await response.json() as { error?: string; version?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível sincronizar a versão.");
      setMessage(`Versão ${result.version ?? "atualizada"}`);
      router.refresh();
    } catch (syncError) {
      setMessage(syncError instanceof Error ? syncError.message : "Não foi possível sincronizar a versão.");
    } finally { setIsSyncing(false); }
  }

  return <button type="button" onClick={syncService} disabled={isSyncing} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#cbd7e4] px-2.5 text-xs font-semibold text-[#294052] transition hover:border-[#83a5c4] hover:bg-[#f8fbfd] disabled:cursor-not-allowed disabled:opacity-60" title="Sincronizar versão e último deployment">
    {isSyncing ? <LoaderCircle className="size-3.5 animate-spin" /> : <GitBranch className="size-3.5" />}
    {isSyncing ? "Sincronizando..." : "Sincronizar"}
    {message ? <span className="max-w-[230px] truncate text-[11px] font-medium text-[#60738a]">{message}</span> : null}
  </button>;
}
