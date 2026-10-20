"use client";

import { CreditCard, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function CreditPurchaseButton({ token, packageId }: { token: string; packageId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function purchase() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/public/credits/checkout", {
        body: JSON.stringify({ packageId, token }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = await response.json().catch(() => ({})) as { error?: string; invoiceUrl?: string | null };
      if (!response.ok || !body.invoiceUrl) throw new Error(body.error || "A cobrança ainda não ficou disponível.");
      window.location.assign(body.invoiceUrl);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Não foi possível abrir o pagamento.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60" disabled={loading} onClick={() => void purchase()} type="button">
        {loading ? <LoaderCircle className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
        {loading ? "Preparando cobrança" : "Comprar créditos"}
      </button>
      {error ? <p className="mt-2 text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}

