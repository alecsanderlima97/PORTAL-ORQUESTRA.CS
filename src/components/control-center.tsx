import Link from "next/link";
import {
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  FileClock,
  LayoutDashboard,
  Map,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { CheckServiceButton } from "@/components/check-service-button";
import { SyncServiceButton } from "@/components/sync-service-button";
import { formatMoney, formatSnapshotDate } from "@/lib/control-center";
import type { ControlSnapshot } from "@/lib/platform-types";

const navItems = [
  ["Visão geral", "/central-admin", LayoutDashboard],
  ["Clientes", "/central-admin/clientes", Building2],
  ["Serviços e sistemas", "/central-admin/servicos", PackageSearch],
  ["Financeiro", "/central-admin/financeiro", CreditCard],
  ["Oportunidades", "/central-admin/oportunidades", BarChart3],
  ["Mapa operacional", "/central-admin/mapa", Map],
  ["Auditoria", "/central-admin/auditoria", FileClock],
] as const;

export function ControlShell({
  activePath,
  children,
}: {
  activePath: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f5f7fa] text-[#10243c]">
      <header className="border-b border-[#dfe6ee] bg-white">
        <div className="mx-auto flex h-[68px] max-w-[1500px] items-center justify-between px-5 sm:px-8">
          <Link href="/central-admin" className="flex items-center gap-3" aria-label="Controle Geral Orquestra.cs">
            <BrandLogo variant="essential" size={34} />
            <div>
              <p className="text-sm font-semibold tracking-tight">Orquestra.cs</p>
              <p className="text-[11px] text-[#75859a]">Controle Geral</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden h-10 w-[min(38vw,420px)] items-center gap-2 rounded-md border border-[#dfe6ee] bg-[#fbfcfe] px-3 text-sm text-[#8795a7] md:flex">
              <Search className="size-4" />
              Buscar clientes, sistemas, cobranças...
            </div>
            <button type="button" className="flex size-10 items-center justify-center rounded-md border border-transparent text-[#697b91] hover:border-[#dfe6ee] hover:bg-[#f7f9fb]" aria-label="Notificações">
              <Bell className="size-4" />
            </button>
            <span className="flex size-9 items-center justify-center rounded-full bg-[#15345a] text-xs font-bold text-white">OC</span>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">Administrador</p>
              <p className="text-xs text-[#75859a]">Orquestra.cs</p>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1500px] flex-col lg:flex-row">
        <aside className="border-b border-[#dfe6ee] bg-white lg:min-h-[calc(100vh-68px)] lg:w-[244px] lg:shrink-0 lg:border-b-0 lg:border-r">
          <nav className="flex gap-1 overflow-x-auto p-3 lg:block lg:space-y-1 lg:p-4" aria-label="Controle Geral">
            {navItems.map(([label, href, Icon]) => {
              const active = href === activePath;
              return (
                <Link
                  href={href}
                  key={href}
                  className={`flex min-w-max items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition lg:w-full ${active ? "bg-[#e9f1fb] text-[#0d4f9a]" : "text-[#5e7086] hover:bg-[#f5f8fc] hover:text-[#10243c]"}`}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden border-t border-[#edf1f5] p-4 lg:block">
            <Link href="/portal" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-[#5e7086] hover:bg-[#f5f8fc]">
              <Users className="size-4" />
              Ver portal do cliente
            </Link>
            <Link href="/identidade" className="mt-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-[#5e7086] hover:bg-[#f5f8fc]">
              <Settings className="size-4" />
              Identidade da marca
            </Link>
          </div>
        </aside>
        <section className="min-w-0 flex-1 px-5 py-7 sm:px-8">
          <div className="mx-auto max-w-[1220px]">{children}</div>
        </section>
      </div>
    </main>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#cbd7e4] bg-white px-6 py-14 text-center">
      <ShieldCheck className="mx-auto size-7 text-[#7f9ab7]" />
      <h2 className="mt-4 text-base font-semibold text-[#203752]">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#708198]">{description}</p>
    </div>
  );
}

export function ControlHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#1769b0]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#10243c]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#708198]">{description}</p>
      </div>
      {action}
    </div>
  );
}

function Metric({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "warning" | "danger" | "success" }) {
  const styles = {
    default: "bg-[#eef5fd] text-[#1769b0]",
    warning: "bg-[#fff5df] text-[#9b6a0b]",
    danger: "bg-[#fff0f0] text-[#b54444]",
    success: "bg-[#eaf8f2] text-[#23825c]",
  };
  return (
    <div className="rounded-lg border border-[#dfe6ee] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-[#74849a]">{label}</p>
        <span className={`size-2 rounded-full ${styles[tone].split(" ")[0]}`} />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-[#10243c]">{value}</p>
      <p className="mt-1 text-xs text-[#8593a5]">{detail}</p>
    </div>
  );
}

export function Overview({ snapshot }: { snapshot: ControlSnapshot }) {
  const overdue = snapshot.charges.filter((charge) => ["vencida", "em_tolerancia", "bloqueada"].includes(charge.status));
  const active = snapshot.companies.filter((company) => ["ativo", "liberado"].includes(company.accessStatus));
  const tolerance = snapshot.companies.filter((company) => company.accessStatus === "em_tolerancia");
  const recurring = snapshot.companies.reduce((total, company) => total + company.monthlyFee, 0);
  const monitoredUsers = snapshot.services.reduce((total, service) => total + (service.usageSummary?.totalUsers ?? 0), 0);

  return (
    <>
      <ControlHeading
        eyebrow="Controle geral"
        title="A operação em uma visão."
        description="Clientes, serviços, financeiro, oportunidades e auditoria em um único centro administrativo."
        action={<Link href="/central-admin/clientes" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#12345b] px-4 text-sm font-semibold text-white hover:bg-[#0d2949]"><Building2 className="size-4" /> Clientes</Link>}
      />
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Clientes ativos" value={String(active.length)} detail="com acesso regular" tone="success" />
        <Metric label="Em tolerância" value={String(tolerance.length)} detail="acompanhar vencimentos" tone="warning" />
        <Metric label="Cobranças em atenção" value={String(overdue.length)} detail="revisão necessária" tone="danger" />
        <Metric label="Receita recorrente" value={formatMoney(recurring)} detail="soma cadastrada" />
        <Metric label="Sistemas cadastrados" value={String(snapshot.services.length)} detail="conectores pendentes inclusos" />
        <Metric label="Usuários monitorados" value={String(monitoredUsers)} detail="resumos dos sistemas" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-lg border border-[#dfe6ee] bg-white">
          <div className="flex items-center justify-between border-b border-[#edf1f5] px-5 py-4">
            <div><h2 className="font-semibold">Clientes</h2><p className="mt-1 text-xs text-[#8290a1]">A carteira cadastrada no Firestore.</p></div>
            <Link href="/central-admin/clientes" className="text-xs font-semibold text-[#1769b0] hover:underline">Ver todos</Link>
          </div>
          {snapshot.companies.length === 0 ? <div className="p-5"><EmptyState title="Nenhum cliente cadastrado ainda" description="Quando o primeiro cliente for criado, ele aparecerá aqui com plano, vencimento, situação financeira e acesso." /></div> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-[#f8fafc] text-xs text-[#77879a]"><tr><th className="px-5 py-3">Empresa</th><th className="px-5 py-3">Plano</th><th className="px-5 py-3">Mensalidade</th><th className="px-5 py-3">Acesso</th></tr></thead><tbody className="divide-y divide-[#edf1f5]">{snapshot.companies.slice(0, 8).map((company) => <tr key={company.id}><td className="px-5 py-3.5 font-medium">{company.tradeName || company.legalName}<span className="mt-1 block text-xs font-normal text-[#8593a5]">{company.city}{company.state ? ` · ${company.state}` : ""}</span></td><td className="px-5 py-3.5 text-[#60738a]">{company.plan}</td><td className="px-5 py-3.5 font-medium">{formatMoney(company.monthlyFee)}</td><td className="px-5 py-3.5"><span className="rounded-full bg-[#edf7f2] px-2.5 py-1 text-xs font-semibold text-[#267d5b]">{company.accessStatus.replaceAll("_", " ")}</span></td></tr>)}</tbody></table></div>
          )}
        </section>
        <aside className="space-y-4">
          <section className="rounded-lg border border-[#dfe6ee] bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Saúde das integrações</h2><Link href="/central-admin/servicos" className="text-xs font-semibold text-[#1769b0]">Ver serviços</Link></div><div className="mt-4 space-y-3">{snapshot.services.length === 0 ? <p className="text-sm leading-6 text-[#708198]">Nenhum sistema conectado. Os sistemas existentes continuam independentes até a criação de um conector seguro.</p> : snapshot.services.slice(0, 5).map((service) => <div key={service.id} className="flex items-center justify-between gap-3 text-sm"><span className="truncate font-medium">{service.name}</span><span className="rounded-full bg-[#fff5df] px-2 py-1 text-[11px] font-semibold text-[#9b6a0b]">{service.connectorStatus.replaceAll("_", " ")}</span></div>)}</div></section>
          <section className="rounded-lg border border-[#dfe6ee] bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Atividade recente</h2><Link href="/central-admin/auditoria" className="text-xs font-semibold text-[#1769b0]">Auditoria</Link></div>{snapshot.audits.length === 0 ? <p className="mt-4 text-sm leading-6 text-[#708198]">As ações administrativas aparecerão aqui quando a Central estiver configurada.</p> : <div className="mt-4 space-y-4">{snapshot.audits.slice(0, 4).map((audit) => <div key={audit.id}><p className="text-sm font-medium">{audit.action}</p><p className="mt-1 text-xs text-[#8593a5]">{audit.targetType} · {formatSnapshotDate(audit.createdAt)}</p></div>)}</div>}</section>
        </aside>
      </div>
    </>
  );
}

export function ClientsView({ snapshot }: { snapshot: ControlSnapshot }) {
  return (
    <>
      <ControlHeading eyebrow="Carteira" title="Clientes" description="Empresas, contratos, planos, acesso e histórico comercial em um só lugar." action={<Link href="/central-admin/clientes/novo" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#12345b] px-4 text-sm font-semibold text-white hover:bg-[#0d2949]"><Building2 className="size-4" /> Novo cliente</Link>} />
      <div className="mt-7 rounded-lg border border-[#dfe6ee] bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-[#edf1f5] px-5 py-4 sm:flex-row sm:items-center"><div><h2 className="font-semibold">Empresas cadastradas</h2><p className="mt-1 text-xs text-[#8290a1]">Os dados serão carregados exclusivamente do tenant central.</p></div><div className="flex h-9 items-center gap-2 rounded-md border border-[#dfe6ee] px-3 text-xs text-[#8b99a9]"><Search className="size-3.5" /> Buscar empresa</div></div>
        {snapshot.companies.length === 0 ? <div className="p-5"><EmptyState title="A carteira ainda está vazia" description="O cadastro do primeiro cliente será feito pela Central e registrado com plano, cobrança, permissões e histórico." /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[940px] text-left text-sm"><thead className="bg-[#f8fafc] text-xs text-[#77879a]"><tr><th className="px-5 py-3">Empresa</th><th className="px-5 py-3">Responsável</th><th className="px-5 py-3">Plano</th><th className="px-5 py-3">Mensalidade</th><th className="px-5 py-3">Acesso</th><th className="px-5 py-3">Ações</th></tr></thead><tbody className="divide-y divide-[#edf1f5]">{snapshot.companies.map((company) => <tr key={company.id}><td className="px-5 py-4 font-semibold">{company.tradeName || company.legalName}<span className="mt-1 block text-xs font-normal text-[#8593a5]">{company.city}{company.state ? ` · ${company.state}` : ""}</span></td><td className="px-5 py-4 text-[#60738a]">{company.responsibleName || "Não informado"}</td><td className="px-5 py-4 text-[#60738a]">{company.plan}</td><td className="px-5 py-4 font-medium">{formatMoney(company.monthlyFee)}</td><td className="px-5 py-4"><span className="rounded-full bg-[#edf7f2] px-2.5 py-1 text-xs font-semibold text-[#267d5b]">{company.accessStatus.replaceAll("_", " ")}</span></td><td className="px-5 py-4"><Link href={`/central-admin/clientes/${company.id}/servico-novo`} className="inline-flex items-center gap-1.5 rounded-md border border-[#cbd7e4] px-2.5 py-1.5 text-xs font-semibold text-[#294052] transition hover:border-[#83a5c4] hover:bg-[#f8fbfd]" title={`Adicionar serviço para ${company.tradeName || company.legalName}`}><Plus className="size-3.5" /> Serviço</Link></td></tr>)}</tbody></table></div>}
      </div>
    </>
  );
}

function ServiceCommercialSummary({ service }: { service: ControlSnapshot["services"][number] }) {
  return <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#edf1f5] pt-4 text-xs sm:grid-cols-4">
    <div><span className="block text-[#8593a5]">Mensalidade</span><strong className="mt-1 block text-sm text-[#203752]">{service.monthlyFee == null ? "Não informado" : formatMoney(service.monthlyFee)}</strong></div>
    <div><span className="block text-[#8593a5]">Desenvolvimento</span><strong className="mt-1 block text-sm text-[#203752]">{service.developmentFee == null ? "Não informado" : formatMoney(service.developmentFee)}</strong></div>
    <div><span className="block text-[#8593a5]">Implantação</span><strong className="mt-1 block text-sm text-[#203752]">{service.implementationFee == null ? "Não informado" : formatMoney(service.implementationFee)}</strong></div>
    <div><span className="block text-[#8593a5]">Suporte</span><strong className="mt-1 block text-sm text-[#203752]">{service.supportFee == null ? "Não informado" : formatMoney(service.supportFee)}</strong></div>
    <div><span className="block text-[#8593a5]">Vencimento</span><strong className="mt-1 block text-sm text-[#203752]">{service.billingDay ? `Dia ${service.billingDay}` : "Não informado"}</strong></div>
    <div><span className="block text-[#8593a5]">Renovação</span><strong className="mt-1 block text-sm text-[#203752]">{formatSnapshotDate(service.renewalDate)}</strong></div>
  </div>;
}

function ServiceReleaseSummary({ service }: { service: ControlSnapshot["services"][number] }) {
  return <div className="mt-5 grid gap-3 border-t border-[#edf1f5] pt-4 text-xs sm:grid-cols-3">
    <div><span className="block text-[#8593a5]">Versão atual</span><strong className="mt-1 block text-sm text-[#203752]">{service.currentVersion || "Não informado"}</strong></div>
    <div><span className="block text-[#8593a5]">Última atualização</span><strong className="mt-1 block text-sm text-[#203752]">{formatSnapshotDate(service.lastUpdatedAt)}</strong></div>
    <div className="sm:col-span-1"><span className="block text-[#8593a5]">Resumo</span><strong className="mt-1 block truncate text-sm font-medium text-[#203752]" title={service.lastUpdateSummary || undefined}>{service.lastUpdateSummary || "Não informado"}</strong></div>
  </div>;
}

function ServiceHealthSummary({ service }: { service: ControlSnapshot["services"][number] }) {
  const statusLabel = service.availabilityStatus === "online" ? "Online" : service.availabilityStatus === "offline" ? "Indisponível" : service.availabilityStatus === "erro" ? "Erro" : "Não verificado";
  const statusClass = service.availabilityStatus === "online" ? "text-[#23825c]" : service.availabilityStatus === "offline" || service.availabilityStatus === "erro" ? "text-[#b54444]" : "text-[#6c7d90]";
  return <div className="mt-5 grid gap-3 border-t border-[#edf1f5] pt-4 text-xs sm:grid-cols-4">
    <div><span className="block text-[#8593a5]">Disponibilidade</span><strong className={`mt-1 block text-sm ${statusClass}`}>{statusLabel}</strong></div>
    <div><span className="block text-[#8593a5]">HTTP / resposta</span><strong className="mt-1 block text-sm text-[#203752]">{service.httpStatus ?? "—"}{service.responseTimeMs == null ? "" : ` · ${service.responseTimeMs} ms`}</strong></div>
    <div><span className="block text-[#8593a5]">HTTPS</span><strong className="mt-1 block text-sm text-[#203752]">{service.sslStatus === "seguro" ? "Seguro" : service.sslStatus === "nao_aplicavel" ? "Não aplicado" : "Não verificado"}</strong></div>
    <div><span className="block text-[#8593a5]">Última verificação</span><strong className="mt-1 block text-sm text-[#203752]">{formatSnapshotDate(service.lastCheckedAt)}</strong></div>
  </div>;
}

export function ServicesView({ snapshot }: { snapshot: ControlSnapshot }) {
  return (
    <>
      <ControlHeading eyebrow="Catálogo operacional" title="Serviços e sistemas" description="Links, ambientes, conectores e último estado conhecido de cada solução contratada." />
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {snapshot.services.length === 0 ? <div className="md:col-span-2"><EmptyState title="Nenhum serviço cadastrado" description="Os produtos atuais continuam separados. Quando você cadastrar um sistema ou site, ele aparecerá aqui com ambiente, valores e status de integração." /></div> : snapshot.services.map((service) => <article key={service.id} className="rounded-lg border border-[#dfe6ee] bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{service.name}</h2><p className="mt-1 text-xs text-[#8593a5]">{service.type.replaceAll("_", " ")} · {service.environment}</p></div><div className="flex flex-wrap items-center justify-end gap-2"><CheckServiceButton serviceId={service.id} /><SyncServiceButton serviceId={service.id} /><Link href={`/central-admin/servicos/${service.id}/editar`} className="inline-flex items-center gap-1.5 rounded-md border border-[#cbd7e4] px-2.5 py-1.5 text-xs font-semibold text-[#294052] transition hover:border-[#83a5c4] hover:bg-[#f8fbfd]" title={`Editar dados comerciais de ${service.name}`}><Pencil className="size-3.5" /> Editar</Link><span className="rounded-full bg-[#fff5df] px-2.5 py-1 text-xs font-semibold text-[#9b6a0b]">{service.connectorStatus.replaceAll("_", " ")}</span></div></div><dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs text-[#8593a5]">Acesso</dt><dd className="mt-1 font-medium">{service.accessStatus.replaceAll("_", " ")}</dd></div><div><dt className="text-xs text-[#8593a5]">Última sincronização</dt><dd className="mt-1 font-medium">{formatSnapshotDate(service.lastSyncAt)}</dd></div></dl><ServiceCommercialSummary service={service} /><ServiceReleaseSummary service={service} /><ServiceHealthSummary service={service} />{service.usageSummary ? <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#edf1f5] pt-4 text-xs sm:grid-cols-3"><div><span className="block text-[#8593a5]">Usuários</span><strong className="mt-1 block text-sm text-[#203752]">{service.usageSummary.totalUsers}</strong></div><div><span className="block text-[#8593a5]">Online agora</span><strong className="mt-1 block text-sm text-[#23825c]">{service.usageSummary.onlineUsers}</strong></div><div><span className="block text-[#8593a5]">Administradores</span><strong className="mt-1 block text-sm text-[#203752]">{service.usageSummary.administrators}</strong></div><div><span className="block text-[#8593a5]">Equipe</span><strong className="mt-1 block text-sm text-[#203752]">{service.usageSummary.staff}</strong></div><div><span className="block text-[#8593a5]">Convites pendentes</span><strong className="mt-1 block text-sm text-[#9b6a0b]">{service.usageSummary.pendingInvitations}</strong></div><div><span className="block text-[#8593a5]">Ativos em 30 dias</span><strong className="mt-1 block text-sm text-[#23825c]">{service.usageSummary.activeUsersLast30Days}</strong></div><div><span className="block text-[#8593a5]">Alterações em 30 dias</span><strong className="mt-1 block text-sm text-[#203752]">{service.usageSummary.recentChangesLast30Days}</strong></div><div><span className="block text-[#8593a5]">Última atividade</span><strong className="mt-1 block text-sm text-[#203752]">{formatSnapshotDate(service.usageSummary.lastActivityAt)}</strong></div></div> : <div className="mt-5 border-t border-[#edf1f5] pt-4 text-xs text-[#708198]">Este serviço ainda não enviou resumo de usuários e acessos.</div>}<div className="mt-5 border-t border-[#edf1f5] pt-4 text-xs text-[#708198]">A visão central é somente um resumo. Usuários, convites e permissões continuam sendo administrados no Admin Dev do sistema.</div></article>)}
      </div>
    </>
  );
}

export function FinanceView({ snapshot }: { snapshot: ControlSnapshot }) {
  const pending = snapshot.charges.filter((charge) => !["paga", "cancelada"].includes(charge.status));
  return (
    <>
      <ControlHeading eyebrow="Controle financeiro" title="Cobranças" description="Mensalidades, vencimentos, tolerância e histórico sem armazenar dados bancários sensíveis." />
      <div className="mt-7 grid gap-3 sm:grid-cols-3"><Metric label="Cobranças cadastradas" value={String(snapshot.charges.length)} detail="no Firestore" /><Metric label="Em atenção" value={String(pending.length)} detail="pendentes ou vencidas" tone={pending.length ? "warning" : "success"} /><Metric label="Confirmadas" value={String(snapshot.charges.filter((charge) => charge.status === "paga").length)} detail="pagamento registrado" tone="success" /></div>
      <div className="mt-6 rounded-lg border border-[#dfe6ee] bg-white">{snapshot.charges.length === 0 ? <div className="p-5"><EmptyState title="Nenhuma cobrança cadastrada" description="O financeiro aparecerá aqui depois que a primeira mensalidade for registrada. Checkout e webhooks entram em uma etapa separada." /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f8fafc] text-xs text-[#77879a]"><tr><th className="px-5 py-3">Referência</th><th className="px-5 py-3">Empresa</th><th className="px-5 py-3">Valor</th><th className="px-5 py-3">Vencimento</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-[#edf1f5]">{snapshot.charges.map((charge) => <tr key={charge.id}><td className="px-5 py-4 font-medium">{charge.referenceMonth || "Sem referência"}</td><td className="px-5 py-4 text-[#60738a]">{charge.tenantId}</td><td className="px-5 py-4 font-medium">{formatMoney(charge.amount)}</td><td className="px-5 py-4 text-[#60738a]">{formatSnapshotDate(charge.dueDate)}</td><td className="px-5 py-4"><span className="rounded-full bg-[#eef5fd] px-2.5 py-1 text-xs font-semibold text-[#1769b0]">{charge.status.replaceAll("_", " ")}</span></td></tr>)}</tbody></table></div>}</div>
    </>
  );
}

export function OpportunitiesView({ snapshot }: { snapshot: ControlSnapshot }) {
  const totalPotential = snapshot.opportunities.reduce((total, opportunity) => total + opportunity.potentialMonthlyFee, 0);
  return (
    <>
      <ControlHeading eyebrow="Desenvolvimento comercial" title="Oportunidades" description="Empresas potenciais, próximas tarefas e possibilidade de mensalidade ou projeto." />
      <div className="mt-7 grid gap-3 sm:grid-cols-3"><Metric label="Oportunidades" value={String(snapshot.opportunities.length)} detail="em todos os estágios" /><Metric label="Potencial mensal" value={formatMoney(totalPotential)} detail="estimativa cadastrada" tone="success" /><Metric label="Próximas tarefas" value={String(snapshot.opportunities.filter((opportunity) => opportunity.nextTaskAt).length)} detail="com acompanhamento" /></div>
      <div className="mt-6 rounded-lg border border-[#dfe6ee] bg-white">{snapshot.opportunities.length === 0 ? <div className="p-5"><EmptyState title="Nenhuma oportunidade registrada" description="As oportunidades vindas de indicação, site, Google ou prospecção manual aparecerão aqui. Use este módulo apenas para empresas potenciais, não para clientes ativos." /></div> : <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">{snapshot.opportunities.map((opportunity) => <article key={opportunity.id} className="rounded-md border border-[#e5ebf1] p-4"><div className="flex items-start justify-between gap-3"><h2 className="font-semibold">{opportunity.companyName}</h2><span className="text-xs font-semibold text-[#1769b0]">{opportunity.commercialStatus}</span></div><p className="mt-2 text-sm text-[#60738a]">{opportunity.segment || "Segmento não informado"}</p><p className="mt-1 text-xs text-[#8593a5]">{opportunity.city}{opportunity.state ? ` · ${opportunity.state}` : ""}</p><p className="mt-4 text-sm font-semibold text-[#10243c]">{formatMoney(opportunity.potentialMonthlyFee)} / mês</p><p className="mt-1 text-xs text-[#8593a5]">Próxima tarefa: {formatSnapshotDate(opportunity.nextTaskAt)}</p></article>)}</div>}</div>
    </>
  );
}

export function MapView({ snapshot }: { snapshot: ControlSnapshot }) {
  const byState = snapshot.companies.reduce<Record<string, number>>((map, company) => { const state = company.state || "Não informado"; map[state] = (map[state] ?? 0) + 1; return map; }, {});
  return (
    <>
      <ControlHeading eyebrow="Visão territorial" title="Mapa operacional" description="Clientes e oportunidades por região, com filtros de serviço, plano e situação financeira." />
      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
        <section className="min-h-[440px] rounded-lg border border-[#dfe6ee] bg-[#eef4f8] p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Cobertura cadastrada</h2><p className="mt-1 text-xs text-[#708198]">A camada cartográfica será ligada quando houver coordenadas e um provedor definido.</p></div><Map className="size-5 text-[#1769b0]" /></div><div className="relative mt-5 flex min-h-[340px] items-center justify-center overflow-hidden rounded-md border border-[#d8e3eb] bg-[#f9fbfd]"><div className="absolute inset-[12%] rounded-[48%] border border-[#c5d8e7]" /><div className="absolute inset-[22%] rounded-[46%] border border-[#d6e4ee]" /><div className="relative text-center"><Map className="mx-auto size-9 text-[#6c9cc1]" /><p className="mt-3 text-sm font-semibold text-[#3a5f7d]">Mapa pronto para os primeiros registros</p><p className="mt-1 max-w-sm text-xs leading-5 text-[#708198]">Não foi criado um mapa fictício. Os marcadores serão calculados a partir das coordenadas autorizadas de clientes e oportunidades.</p></div></div></section>
        <aside className="rounded-lg border border-[#dfe6ee] bg-white p-5"><h2 className="font-semibold">Empresas por estado</h2>{Object.keys(byState).length === 0 ? <p className="mt-4 text-sm leading-6 text-[#708198]">Nenhum endereço foi cadastrado ainda.</p> : <div className="mt-4 space-y-3">{Object.entries(byState).sort((a, b) => b[1] - a[1]).map(([state, count]) => <div key={state} className="flex items-center justify-between border-b border-[#edf1f5] pb-3 text-sm"><span>{state}</span><strong>{count}</strong></div>)}</div>}<div className="mt-6 border-t border-[#edf1f5] pt-4 text-xs leading-5 text-[#8593a5]">O mapa não rastreia localização pessoal. Ele usa apenas endereços comerciais e oportunidades cadastradas.</div></aside>
      </div>
    </>
  );
}

export function AuditView({ snapshot }: { snapshot: ControlSnapshot }) {
  return (
    <>
      <ControlHeading eyebrow="Rastreabilidade" title="Auditoria" description="Registro das ações administrativas e dos eventos confirmados pelos conectores." />
      <div className="mt-7 rounded-lg border border-[#dfe6ee] bg-white">{snapshot.audits.length === 0 ? <div className="p-5"><EmptyState title="Nenhum evento registrado" description="A auditoria será escrita pelo servidor quando houver ações reais na Central. O navegador não poderá forjar ou editar eventos." /></div> : <div className="divide-y divide-[#edf1f5]">{snapshot.audits.map((audit) => <div key={audit.id} className="flex flex-col justify-between gap-2 px-5 py-4 sm:flex-row sm:items-center"><div><p className="font-medium">{audit.action}</p><p className="mt-1 text-xs text-[#8593a5]">{audit.targetType} · {audit.targetId} · {audit.actorRole}</p></div><time className="text-xs text-[#8593a5]">{formatSnapshotDate(audit.createdAt)}</time></div>)}</div>}</div>
    </>
  );
}
