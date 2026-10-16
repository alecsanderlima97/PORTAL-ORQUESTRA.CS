import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CreditCard, ExternalLink, Info, ReceiptText } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { formatMoney, formatSnapshotDate, getTenantSnapshot } from "@/lib/control-center";
import { requireTenantUser } from "@/lib/session";
import type { BillingStatus, ManagedService, TenantSnapshot } from "@/lib/platform-types";

export const dynamic = "force-dynamic";

const statusLabels: Record<BillingStatus, string> = {
  agendada: "Agendada",
  aberta: "Em aberto",
  pendente: "Pendente",
  paga: "Paga",
  em_processamento: "Em processamento",
  vencida: "Vencida",
  em_tolerancia: "Em tolerância",
  bloqueada: "Bloqueada",
  estornada: "Estornada",
  cancelada: "Cancelada",
  falha_pagamento: "Falha no pagamento",
  revisao_manual: "Em revisão",
};

function PortalHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
        <Link href="/portal" className="flex items-center gap-3">
          <BrandLogo variant="essential" size={38} />
          <div>
            <p className="text-sm font-semibold">Orquestra.cs</p>
            <p className="text-xs text-zinc-500">Portal do cliente</p>
          </div>
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}

function statusClass(status: BillingStatus) {
  if (status === "paga") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (["vencida", "bloqueada", "falha_pagamento"].includes(status)) return "bg-red-50 text-red-700 ring-red-100";
  return "bg-amber-50 text-amber-800 ring-amber-100";
}

function serviceCharges(snapshot: TenantSnapshot, serviceId: string) {
  return snapshot.charges
    .filter((charge) => charge.serviceId === serviceId)
    .sort((left, right) => (right.dueDate ?? "").localeCompare(left.dueDate ?? ""));
}

function PaymentCard({ service, charges }: { service: ManagedService; charges: TenantSnapshot["charges"] }) {
  const currentCharge = charges.find((charge) => !["paga", "cancelada"].includes(charge.status)) ?? charges[0];
  const paymentUrl = currentCharge?.invoiceUrl ?? service.billingCheckoutUrl ?? null;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Produto contratado</p>
          <h2 className="mt-2 text-xl font-semibold">{service.name}</h2>
          <p className="mt-1 text-sm text-zinc-500">{service.plan} · {service.subscriptionStatus.replaceAll("_", " ")}</p>
        </div>
        <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${currentCharge ? statusClass(currentCharge.status) : "bg-zinc-50 text-zinc-600 ring-zinc-200"}`}>
          {currentCharge ? statusLabels[currentCharge.status] : "Sem cobrança aberta"}
        </span>
      </div>

      <dl className="mt-6 grid gap-4 border-y border-zinc-100 py-5 text-sm sm:grid-cols-3">
        <div><dt className="text-zinc-500">Mensalidade</dt><dd className="mt-1 font-semibold">{service.monthlyFee == null ? "Não informado" : formatMoney(service.monthlyFee)}</dd></div>
        <div><dt className="text-zinc-500">Vencimento</dt><dd className="mt-1 font-semibold">{service.billingDay ? `Dia ${service.billingDay}` : "Não informado"}</dd></div>
        <div><dt className="text-zinc-500">Renovação</dt><dd className="mt-1 font-semibold">{formatSnapshotDate(service.renewalDate)}</dd></div>
      </dl>

      {currentCharge ? (
        <div className="mt-5 rounded-md bg-zinc-50 p-4">
          <div className="flex items-start gap-3">
            <ReceiptText className="mt-0.5 size-5 shrink-0 text-emerald-700" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Cobrança {currentCharge.referenceMonth || "atual"}</p>
              <p className="mt-1 text-sm text-zinc-600">Valor: {formatMoney(currentCharge.amount)} · Vencimento: {formatSnapshotDate(currentCharge.dueDate)}</p>
              {paymentUrl && currentCharge.status !== "paga" ? (
                <a href={paymentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800">
                  <CreditCard className="size-4" />
                  Abrir pagamento seguro
                  <ExternalLink className="size-3.5" />
                </a>
              ) : currentCharge.status === "paga" ? (
                <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-4" /> Pagamento confirmado</p>
              ) : (
                <p className="mt-3 text-sm text-amber-800">O link de pagamento ainda está sendo preparado. Nenhuma cobrança será duplicada.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex items-start gap-3 rounded-md bg-zinc-50 p-4 text-sm text-zinc-600">
          <Info className="mt-0.5 size-5 shrink-0 text-zinc-500" />
          <p>A cobrança deste produto ainda não foi gerada no Portal. Entre em contato com o suporte para ativar o primeiro pagamento.</p>
        </div>
      )}
    </article>
  );
}

export default async function PaymentsPage({ searchParams }: { searchParams?: Promise<{ serviceId?: string | string[]; system?: string | string[] }> }) {
  const session = await requireTenantUser();
  if (!session.tenantId) redirect("/login?reason=tenant_required");
  const snapshot = await getTenantSnapshot(session.tenantId);
  const rawServiceId = (await searchParams)?.serviceId;
  const rawSystem = (await searchParams)?.system;
  const requestedServiceId = Array.isArray(rawServiceId) ? rawServiceId[0] : rawServiceId;
  const requestedSystem = Array.isArray(rawSystem) ? rawSystem[0] : rawSystem;
  const services = requestedServiceId
    ? snapshot.services.filter((service) => service.id === requestedServiceId)
    : requestedSystem
      ? snapshot.services.filter((service) => service.sourceSystem === requestedSystem)
      : snapshot.services;
  const generalCharges = snapshot.charges.filter((charge) => !charge.serviceId);

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-zinc-950">
      <PortalHeader />
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 lg:px-8">
        <Link href="/portal" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"><ArrowLeft className="size-4" /> Voltar para meus sistemas</Link>
        <div className="mt-7 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Central de pagamentos</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Planos, mensalidades e vencimentos</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">Cada produto possui seu próprio contrato. Confira o sistema correto antes de abrir a cobrança.</p>
        </div>

        <section className="mt-8 space-y-4">
          {services.length > 0 ? services.map((service) => <PaymentCard key={service.id} service={service} charges={serviceCharges(snapshot, service.id)} />) : (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600">Nenhum produto vinculado foi encontrado para esta conta.</div>
          )}
        </section>

        {generalCharges.length > 0 ? (
          <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Cobranças gerais da empresa</h2>
            <p className="mt-1 text-sm text-zinc-500">Estas cobranças ainda não estão vinculadas a um produto específico. O suporte deve classificá-las antes do pagamento.</p>
            <div className="mt-4 space-y-2 text-sm">{generalCharges.map((charge) => <div key={charge.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-zinc-50 px-3 py-3"><span>{charge.referenceMonth || "Cobrança sem referência"}</span><strong>{formatMoney(charge.amount)}</strong><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(charge.status)}`}>{statusLabels[charge.status]}</span></div>)}</div>
          </section>
        ) : null}

        <p className="mt-8 text-center text-xs leading-5 text-zinc-500">O pagamento é processado pelo provedor financeiro. O Portal não armazena dados de cartão.</p>
      </div>
    </main>
  );
}
