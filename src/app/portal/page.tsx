import Link from "next/link";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  LayoutGrid,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import { formatMoney, formatSnapshotDate, getTenantSnapshot } from "@/lib/control-center";
import { requireTenantUser } from "@/lib/session";
import type { CompanyAccessStatus, ManagedService, TenantSnapshot } from "@/lib/platform-types";

const accessLabels: Record<CompanyAccessStatus, string> = {
  ativo: "Ativo",
  em_tolerancia: "Em tolerância",
  bloqueio_agendado: "Bloqueio agendado",
  bloqueado: "Bloqueado",
  liberacao_pendente: "Liberação pendente",
  liberado: "Liberado",
  revisao_manual: "Em revisão",
  erro_sincronizacao: "Falha de sincronização",
};

function AccessBadge({ status }: { status: CompanyAccessStatus }) {
  const tone = status === "ativo" || status === "liberado"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
    : status === "bloqueado" || status === "erro_sincronizacao"
      ? "bg-red-50 text-red-700 ring-red-100"
      : "bg-amber-50 text-amber-800 ring-amber-100";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>
      {accessLabels[status]}
    </span>
  );
}

function serviceLabel(service: ManagedService) {
  if (service.connectorStatus === "ativo") return "Conector sincronizado";
  if (service.connectorStatus === "com_falha") return "Conector com falha";
  if (service.connectorStatus === "desativado") return "Sincronização desativada";
  return "Aguardando conexão do sistema";
}

function PortalHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
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

function PortalEmptyState({ name }: { name: string }) {
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-zinc-950">
      <PortalHeader />
      <div className="mx-auto flex min-h-[calc(100vh-81px)] max-w-3xl items-center px-5 py-10 sm:px-6">
        <section className="w-full rounded-lg border border-zinc-200 bg-white p-7 shadow-sm sm:p-10">
          <div className="flex size-11 items-center justify-center rounded-md bg-amber-50 text-amber-700">
            <ShieldCheck className="size-5" />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Acesso confirmado</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Olá, {name}.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-600">
            Seu usuário foi autenticado, mas a empresa ainda não possui um ambiente configurado no Portal Orquestra.cs.
            Fale com o suporte para concluir a ativação.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="mailto:orquestracs@gmail.com" className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800">
              Falar com suporte
            </a>
            <Link href="/" className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 px-4 text-sm font-semibold hover:bg-zinc-50">
              Voltar ao site
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function PortalSidebar() {
  const items = [
    ["Meus sistemas", LayoutGrid],
    ["Plano e vencimento", ShieldCheck],
    ["Usuários", Users],
    ["Suporte", CircleHelp],
    ["Meu perfil", UserRound],
    ["Configurações", Settings],
  ] as const;

  return (
    <aside className="h-fit rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      {items.map(([label, Icon], index) => (
        <button
          key={label}
          type="button"
          disabled={index > 0}
          className={`flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition ${index === 0 ? "bg-zinc-50 text-zinc-950" : "text-zinc-500 hover:bg-zinc-50 disabled:cursor-not-allowed"}`}
        >
          <Icon className="size-4" />
          {label}
          {index > 0 && <span className="ml-auto text-[10px] uppercase tracking-[0.12em] text-zinc-400">Em breve</span>}
        </button>
      ))}
    </aside>
  );
}

function ServiceCard({ service }: { service: ManagedService }) {
  const canOpen = Boolean(service.url) && service.accessStatus !== "bloqueado";

  return (
    <article className="rounded-lg border border-zinc-200 p-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-md bg-sky-50 text-sky-700 ring-1 ring-sky-100">
            <LayoutGrid className="size-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{service.name}</h3>
              <AccessBadge status={service.accessStatus} />
            </div>
            <p className="mt-1 text-sm text-zinc-500">{service.plan} · {serviceLabel(service)}</p>
          </div>
        </div>
        {canOpen ? (
          <a href={service.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800">
            Abrir sistema
            <ChevronRight className="size-4" />
          </a>
        ) : (
          <span className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 px-3 text-sm font-semibold text-zinc-400">
            Acesso indisponível
          </span>
        )}
      </div>
    </article>
  );
}

function PortalOverview({ snapshot, userName, userEmail }: { snapshot: TenantSnapshot; userName: string; userEmail: string }) {
  const { company } = snapshot;
  if (!company) return <PortalEmptyState name={userName} />;

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-zinc-950">
      <PortalHeader />
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <PortalSidebar />
        <section className="space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-medium text-zinc-500">Bem-vindo, {userName}</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">{company.tradeName ?? company.legalName}</h1>
                <p className="mt-2 text-sm text-zinc-500">Ambiente seguro da sua empresa · Última atividade: {formatSnapshotDate(snapshot.lastActivityAt)}</p>
              </div>
              <AccessBadge status={company.accessStatus} />
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <div className="rounded-md bg-zinc-50 p-4"><p className="text-sm text-zinc-500">Plano</p><p className="mt-2 text-lg font-semibold">{company.plan}</p></div>
              <div className="rounded-md bg-zinc-50 p-4"><p className="text-sm text-zinc-500">Mensalidade</p><p className="mt-2 text-lg font-semibold">{formatMoney(company.monthlyFee)}</p></div>
              <div className="rounded-md bg-zinc-50 p-4"><p className="text-sm text-zinc-500">Vencimento</p><p className="mt-2 text-lg font-semibold">Dia {company.billingDay || "não informado"}</p></div>
              <div className="rounded-md bg-zinc-50 p-4"><p className="text-sm text-zinc-500">Usuários monitorados</p><p className="mt-2 text-lg font-semibold">{snapshot.totalUsers || "Não informado"}</p></div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-semibold text-emerald-700">Sistemas liberados</p><h2 className="mt-1 text-xl font-semibold">Acessos da empresa</h2></div>
                <ExternalLink className="size-5 text-zinc-400" />
              </div>
              <div className="mt-5 space-y-3">
                {snapshot.services.length > 0 ? snapshot.services.map((service) => <ServiceCard key={service.id} service={service} />) : (
                  <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm leading-6 text-zinc-500">Nenhum sistema foi liberado para esta empresa ainda. O suporte poderá informar o próximo passo.</div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2"><Bell className="size-5 text-emerald-700" /><h2 className="font-semibold">Avisos</h2></div>
                <p className="mt-3 text-sm leading-6 text-zinc-600">Seu acesso está sendo controlado pelo status comercial da empresa. Em caso de dúvidas, fale com o suporte.</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold">Atividade dos usuários</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-600">{snapshot.activeUsersLast30Days ? `${snapshot.activeUsersLast30Days} usuários ativos nos últimos 30 dias.` : "O resumo de uso ainda não foi sincronizado."}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2"><UserRound className="size-5 text-emerald-700" /><h2 className="font-semibold">Meu perfil</h2></div>
                <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-zinc-500">Nome</dt><dd className="mt-1 font-medium">{userName}</dd></div><div><dt className="text-zinc-500">Empresa</dt><dd className="mt-1 font-medium">{company.tradeName ?? company.legalName}</dd></div><div><dt className="text-zinc-500">E-mail</dt><dd className="mt-1 break-all font-medium">{userEmail}</dd></div></dl>
              </div>
              <a href="mailto:orquestracs@gmail.com" className="flex h-10 w-full items-center justify-center rounded-md border border-zinc-200 text-sm font-semibold hover:bg-white">Solicitar suporte</a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default async function PortalPage() {
  const session = await requireTenantUser();
  if (!session.tenantId) return <PortalEmptyState name={session.name} />;
  const snapshot = await getTenantSnapshot(session.tenantId);
  return <PortalOverview snapshot={snapshot} userName={session.name} userEmail={session.email} />;
}
