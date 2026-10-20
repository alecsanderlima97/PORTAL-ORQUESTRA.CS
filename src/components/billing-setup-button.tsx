"use client";

import { CreditCard, ExternalLink, LoaderCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { BillingEnvironment } from "@/lib/platform-types";

export function BillingSetupButton({ serviceId, subscriptionId, environment, checkoutUrl }: { serviceId: string; subscriptionId?: string | null; environment?: BillingEnvironment | null; checkoutUrl?: string | null }) {
  const [configuredId, setConfiguredId] = useState(subscriptionId ?? null);
  const [configuredEnvironment, setConfiguredEnvironment] = useState(environment ?? null);
  const [publicUrl, setPublicUrl] = useState(checkoutUrl ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    if (configuredId) return;
    if (environment === "production") {
      if (!window.confirm("Atenção: este produto será cadastrado no Asaas Produção e poderá gerar cobrança real. Confirmar criação da assinatura?")) return;
    } else if (!window.confirm("Preparar a assinatura deste produto no ambiente configurado do Asaas? Se o Portal estiver em Produção, a assinatura poderá gerar cobrança real no vencimento.")) {
      return;
    }
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      const csrf = await csrfResponse.json() as { csrfToken?: string };
      if (!csrfResponse.ok || !csrf.csrfToken) throw new Error("Sessão administrativa inválida.");
      const endpoint = `/api/central-admin/services/${encodeURIComponent(serviceId)}/billing/setup`;
      const requestSetup = (confirmProduction = false) => fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csrfToken: csrf.csrfToken, confirmProduction }),
      });
      let response = await requestSetup(environment === "production");
      let result = await response.json() as { code?: string; error?: string; subscriptionId?: string; environment?: BillingEnvironment; checkoutUrl?: string; alreadyConfigured?: boolean };
      if (!response.ok && result.code === "production_confirmation_required" && window.confirm("Atenção: este produto será cadastrado no Asaas Produção e poderá gerar cobrança real. Confirmar criação da assinatura?")) {
        response = await requestSetup(true);
        result = await response.json() as { code?: string; error?: string; subscriptionId?: string; environment?: BillingEnvironment; checkoutUrl?: string; alreadyConfigured?: boolean };
      }
      if (!response.ok) throw new Error(result.error ?? "Não foi possível preparar a cobrança.");
      setConfiguredId(result.subscriptionId ?? configuredId ?? "configured");
      setConfiguredEnvironment(result.environment ?? configuredEnvironment ?? "sandbox");
      setPublicUrl(result.checkoutUrl ?? publicUrl);
      setMessage(result.alreadyConfigured ? "A assinatura já estava configurada." : `Assinatura preparada em ${result.environment === "production" ? "produção" : "ambiente de testes"}.`);
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "Não foi possível preparar a cobrança.");
    } finally {
      setLoading(false);
    }
  }

  if (configuredId) {
    return <div className="flex flex-wrap items-center gap-2 text-xs"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf7f2] px-2.5 py-1.5 font-semibold text-[#267d5b]"><ShieldCheck className="size-3.5" /> Assinatura Asaas configurada</span><span className="text-[#708198]">{configuredEnvironment === "production" ? "produção" : "sandbox"}</span>{publicUrl ? <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-[#cbd7e4] px-2.5 py-1.5 font-semibold text-[#294052] hover:bg-[#f8fbfd]"><ExternalLink className="size-3.5" /> Página pública de pagamento</a> : null}{message ? <span role="status" className="text-[#267d5b]">{message}</span> : null}</div>;
  }

  const ActionIcon = loading ? LoaderCircle : CreditCard;
  return <div className="flex flex-col items-start gap-2"><button type="button" onClick={handleSetup} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cbd7e4] px-3 text-xs font-semibold text-[#294052] transition hover:border-[#83a5c4] hover:bg-[#f8fbfd] disabled:cursor-not-allowed disabled:opacity-60"><ActionIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />{loading ? "Preparando..." : "Preparar assinatura no Asaas"}</button>{error ? <p role="alert" className="max-w-md text-xs font-medium text-red-700">{error}</p> : <p className="text-xs text-[#8593a5]">A confirmação informa se a ação será em testes ou em Produção.</p>}</div>;
}
