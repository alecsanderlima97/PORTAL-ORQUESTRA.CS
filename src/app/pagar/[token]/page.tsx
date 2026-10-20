import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CreditCard, Info, ReceiptText } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { formatMoney, formatSnapshotDate } from "@/lib/formatters";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { hashPublicPaymentToken } from "@/lib/payment-links";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  aberta: "Em aberto",
  pendente: "Pendente",
  paga: "Paga",
  em_processamento: "Em processamento",
  vencida: "Vencida",
  estornada: "Estornada",
  cancelada: "Cancelada",
  falha_pagamento: "Falha no pagamento",
  revisao_manual: "Em revisão",
};

type PublicCharge = {
  id: string;
  referenceMonth?: string | null;
  dueDate?: unknown;
  status?: string | null;
  invoiceUrl?: string | null;
};

function dateValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return null;
}

function statusClass(status: string) {
  if (status === "paga") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (["vencida", "falha_pagamento"].includes(status)) return "bg-red-50 text-red-700 ring-red-100";
  return "bg-amber-50 text-amber-800 ring-amber-100";
}

function PublicHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <BrandLogo variant="essential" size={38} />
          <div>
            <p className="text-sm font-semibold">Orquestra.cs</p>
            <p className="text-xs text-zinc-500">Pagamento da assinatura</p>
          </div>
        </Link>
        <a href="mailto:orquestracs@gmail.com" className="text-sm font-semibold text-zinc-600 hover:text-zinc-950">Precisa de ajuda?</a>
      </div>
    </header>
  );
}

export default async function PublicPaymentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 32 || token.length > 160) notFound();

  const db = getFirebaseAdminDb();
  const serviceQuery = await db.collection("managedServices").where("billingPublicTokenHash", "==", hashPublicPaymentToken(token)).limit(1).get();
  const serviceSnapshot = serviceQuery.docs[0];
  if (!serviceSnapshot) notFound();

  const service = serviceSnapshot.data();
  const tenantId = typeof service.tenantId === "string" ? service.tenantId : "";
  if (!tenantId) notFound();

  const [companySnapshot, chargesSnapshot] = await Promise.all([
    db.collection("companies").doc(tenantId).get(),
    db.collection("billingCharges").where("serviceId", "==", serviceSnapshot.id).limit(20).get(),
  ]);
  const company = companySnapshot.data() ?? {};
  const charges: PublicCharge[] = chargesSnapshot.docs
    .map((doc) => {
      const raw = doc.data();
      return {
        id: doc.id,
        referenceMonth: typeof raw.referenceMonth === "string" ? raw.referenceMonth : null,
        dueDate: raw.dueDate,
        status: typeof raw.status === "string" ? raw.status : null,
        invoiceUrl: typeof raw.invoiceUrl === "string" ? raw.invoiceUrl : null,
      };
    })
    .sort((left, right) => String(right.dueDate ?? "").localeCompare(String(left.dueDate ?? "")));
  const currentCharge = charges.find((charge) => !["paga", "cancelada"].includes(String(charge.status))) ?? charges[0];
  const paymentUrl = typeof currentCharge?.invoiceUrl === "string" && currentCharge.invoiceUrl.startsWith("https://")
    ? currentCharge.invoiceUrl
    : null;
  const companyName = String(company.tradeName || company.legalName || company.name || "Cliente Orquestra.cs");
  const serviceName = String(service.name || "Produto Orquestra.cs");
  const plan = String(service.plan || "Plano contratado");
  const monthlyFee = Number(service.monthlyFee);
  const status = String(currentCharge?.status || "");

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-zinc-950">
      <PublicHeader />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Pagamento seguro</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Mensalidade do seu produto</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">Você não precisa criar uma conta no Portal. Confira os dados abaixo e continue o pagamento pelo Asaas.</p>
        </div>

        <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-zinc-100 pb-6 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Empresa</p>
              <h2 className="mt-2 text-xl font-semibold">{companyName}</h2>
              <p className="mt-1 text-sm text-zinc-500">{serviceName} · {plan}</p>
            </div>
            {currentCharge ? <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(status)}`}>{statusLabels[status] ?? "Em atualização"}</span> : null}
          </div>

          <dl className="grid gap-5 border-b border-zinc-100 py-6 sm:grid-cols-3">
            <div><dt className="text-sm text-zinc-500">Mensalidade</dt><dd className="mt-1 text-lg font-semibold">{Number.isFinite(monthlyFee) && monthlyFee > 0 ? formatMoney(monthlyFee) : "Conforme contrato"}</dd></div>
            <div><dt className="text-sm text-zinc-500">Vencimento</dt><dd className="mt-1 text-lg font-semibold">{currentCharge?.dueDate ? formatSnapshotDate(dateValue(currentCharge.dueDate)) : service.billingDay ? `Dia ${service.billingDay}` : "A confirmar"}</dd></div>
            <div><dt className="text-sm text-zinc-500">Processamento</dt><dd className="mt-1 text-lg font-semibold">Asaas</dd></div>
          </dl>

          {currentCharge ? (
            <div className="mt-6 rounded-md bg-zinc-50 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <ReceiptText className="mt-0.5 size-5 shrink-0 text-emerald-700" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Cobrança {String(currentCharge.referenceMonth || "atual")}</p>
                  <p className="mt-1 text-sm text-zinc-600">O pagamento será identificado automaticamente neste produto.</p>
                  {status === "paga" ? (
                    <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-4" /> Pagamento confirmado</p>
                  ) : paymentUrl ? (
                    <a href={paymentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"><CreditCard className="size-4" /> Continuar para pagamento seguro</a>
                  ) : (
                    <p className="mt-4 text-sm text-amber-800">A cobrança está sendo preparada. Este link continuará válido e você poderá tentar novamente em instantes.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex items-start gap-3 rounded-md bg-zinc-50 p-4 text-sm text-zinc-600"><Info className="mt-0.5 size-5 shrink-0 text-zinc-500" /><p>A cobrança ainda está sendo gerada. Este link já está vinculado ao produto correto e não exige cadastro no Portal.</p></div>
          )}
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-500">O Portal não armazena dados de cartão. Para dúvidas sobre valores ou vencimento, fale com <a href="mailto:orquestracs@gmail.com" className="font-semibold underline">orquestracs@gmail.com</a>.</p>
      </div>
    </main>
  );
}
