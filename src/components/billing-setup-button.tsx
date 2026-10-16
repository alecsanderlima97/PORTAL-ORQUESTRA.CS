"use client";

import { CreditCard, LoaderCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { BillingEnvironment } from "@/lib/platform-types";

export function BillingSetupButton({ serviceId, subscriptionId, environment }: { serviceId: string; subscriptionId?: string | null; environment?: BillingEnvironment | null }) {
  const [configuredId, setConfiguredId] = useState(subscriptionId ?? null);
  const [configuredEnvironment, setConfiguredEnvironment] = useState(environment ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    if (configuredId) return;
    if (!window.confirm("Preparar a assinatura deste produto no Asaas sandbox? Nenhuma cobrança de produção será criada.")) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      const csrf = await csrfResponse.json() as { csrfToken?: string };
      if (!csrfResponse.ok || !csrf.csrfToken) throw new Error("Sessão administrativa inválida.");
      const response = await fetch(`/api/central-admin/services/${encodeURIComponent(serviceId)}/billing/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csrfToken: csrf.csrfToken }),
      });
      const result = await response.json() as { error?: string; subscriptionId?: string; environment?: BillingEnvironment; alreadyConfigured?: boolean };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível preparar a cobrança.");
      setConfiguredId(result.subscriptionId ?? configuredId ?? "configured");
      setConfiguredEnvironment(result.environment ?? configuredEnvironment ?? "sandbox");
      setMessage(result.alreadyConfigured ? "A assinatura já estava configurada." : "Assinatura preparada no ambiente de testes.");
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "Não foi possível preparar a cobrança.");
    } finally {
      setLoading(false);
    }
  }

  if (configuredId) {
    return <div className="flex flex-wrap items-center gap-2 text-xs"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf7f2] px-2.5 py-1.5 font-semibold text-[#267d5b]"><ShieldCheck className="size-3.5" /> Assinatura Asaas configurada</span><span className="text-[#708198]">{configuredEnvironment === "production" ? "produção" : "sandbox"}</span>{message ? <span role="status" className="text-[#267d5b]">{message}</span> : null}</div>;
  }

  const ActionIcon = loading ? LoaderCircle : CreditCard;
  return <div className="flex flex-col items-start gap-2"><button type="button" onClick={handleSetup} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cbd7e4] px-3 text-xs font-semibold text-[#294052] transition hover:border-[#83a5c4] hover:bg-[#f8fbfd] disabled:cursor-not-allowed disabled:opacity-60"><ActionIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />{loading ? "Preparando..." : "Preparar cobrança sandbox"}</button>{error ? <p role="alert" className="max-w-md text-xs font-medium text-red-700">{error}</p> : <p className="text-xs text-[#8593a5]">Apenas prepara o contrato de teste; não cobra o cliente.</p>}</div>;
}
