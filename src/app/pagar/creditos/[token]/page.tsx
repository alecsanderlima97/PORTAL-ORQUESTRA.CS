import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { CreditPurchaseButton } from "@/components/credit-purchase-button";
import { AI_CREDIT_PACKAGES, verifyCreditPurchaseToken } from "@/lib/ai-credit-purchases";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { formatMoney } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function CreditPaymentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const claims = verifyCreditPurchaseToken(token);
  if (!claims) notFound();

  const db = getFirebaseAdminDb();
  const serviceQuery = await db.collection("managedServices")
    .where("sourceSystem", "==", claims.sourceSystem)
    .where("externalTenantId", "==", claims.externalTenantId)
    .limit(5)
    .get();
  const services = serviceQuery.docs.filter((doc) => doc.data().isArchived !== true);
  if (services.length !== 1) notFound();

  const service = services[0].data();
  const companyId = typeof service.tenantId === "string" ? service.tenantId : "";
  const companySnapshot = companyId ? await db.collection("companies").doc(companyId).get() : null;
  const company = companySnapshot?.data() ?? {};
  const companyName = String(company.tradeName || company.legalName || company.name || "Cliente Orquestra.cs");
  const serviceName = String(service.name || "Produto Orquestra.cs");

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3"><BrandLogo variant="essential" size={38} /><div><p className="text-sm font-semibold">Orquestra.cs</p><p className="text-xs text-zinc-500">Compra de créditos IA</p></div></Link>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700"><ShieldCheck className="size-4" /> Pagamento seguro</span>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"><ArrowLeft className="size-4" /> Voltar</Link>
        <div className="mt-8 max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Recarga do sistema</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Créditos IA para {serviceName}</h1><p className="mt-3 text-sm leading-6 text-zinc-600">Empresa: <strong>{companyName}</strong>. Escolha um pacote. O saldo será liberado no próprio sistema somente após a confirmação do pagamento.</p></div>
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {Object.entries(AI_CREDIT_PACKAGES).map(([packageId, item]) => (
            <article className="flex flex-col rounded-lg border border-zinc-200 bg-white p-5 shadow-sm" key={packageId}>
              <span className="inline-flex w-fit items-center gap-2 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase text-emerald-800"><Bot className="size-3.5" /> {item.label}</span>
              <strong className="mt-5 text-3xl">{item.credits}</strong><p className="text-sm text-zinc-500">créditos IA</p>
              <p className="mt-4 min-h-10 text-sm leading-5 text-zinc-600">Recarga vinculada ao {serviceName}.</p>
              <div className="mt-auto flex items-end justify-between gap-3 pt-6"><strong className="text-lg">{formatMoney(item.price)}</strong><CreditPurchaseButton packageId={packageId} token={token} /></div>
            </article>
          ))}
        </section>
        <p className="mt-8 text-center text-xs leading-5 text-zinc-500">O Portal não armazena dados de cartão. A cobrança é processada pelo Asaas e o crédito é aplicado pelo sistema de origem.</p>
      </div>
    </main>
  );
}

