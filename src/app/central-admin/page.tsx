import Link from "next/link";
import { ExternalLink, FileClock, Search, ShieldAlert, UserPlus } from "lucide-react";
import {
  auditEvents,
  companies,
  formatCurrency,
  formatDate,
  platformMetrics,
  products,
} from "@/lib/portal-data";
import { MetricCard, StatusPill } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";

export default function CentralAdminPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo variant="essential" size={38} />
            <div>
              <p className="text-sm font-semibold">Orquestra.cs</p>
              <p className="text-xs text-zinc-500">Central Admin</p>
            </div>
          </Link>
          <Link
            href="/portal"
            className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Ver cliente
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-6 lg:px-8">
        <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Controle geral da Orquestra.cs</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Clientes, planos, vencimentos e módulos.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
              Esta área é separada do admin de cada cliente. Ela controla a carteira SaaS,
              liberações, bloqueios, cobrança manual, auditoria e links dos sistemas externos.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold shadow-sm hover:bg-zinc-50">
              <Search className="size-4" />
              Buscar
            </button>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800">
              <UserPlus className="size-4" />
              Novo cliente
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {platformMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 p-5">
              <div>
                <h2 className="text-lg font-semibold">Carteira de clientes</h2>
                <p className="mt-1 text-sm text-zinc-500">Visao comercial central da plataforma.</p>
              </div>
              <ShieldAlert className="size-5 text-zinc-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-[0.12em] text-zinc-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Cliente</th>
                    <th className="px-5 py-3 font-semibold">Produto</th>
                    <th className="px-5 py-3 font-semibold">Plano</th>
                    <th className="px-5 py-3 font-semibold">Mensalidade</th>
                    <th className="px-5 py-3 font-semibold">Vencimento</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {companies.map((company) => {
                    const companyProducts = products
                      .filter((product) => company.productIds.includes(product.id))
                      .map((product) => product.shortName)
                      .join(", ");
                    return (
                      <tr key={company.id} className="align-top">
                        <td className="px-5 py-4">
                          <p className="font-semibold">{company.name}</p>
                          <p className="mt-1 text-xs text-zinc-500">{company.document}</p>
                        </td>
                        <td className="px-5 py-4 text-zinc-700">{companyProducts}</td>
                        <td className="px-5 py-4 text-zinc-700">{company.plan}</td>
                        <td className="px-5 py-4 font-semibold">{formatCurrency(company.monthlyFee)}</td>
                        <td className="px-5 py-4 text-zinc-700">{formatDate(company.dueDate)}</td>
                        <td className="px-5 py-4">
                          <StatusPill status={company.status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <a
                              href={company.externalUrl}
                              className="inline-flex size-9 items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50"
                              title="Abrir sistema externo"
                            >
                              <ExternalLink className="size-4" />
                            </a>
                            <button
                              className="inline-flex size-9 items-center justify-center rounded-md border border-zinc-200 hover:bg-zinc-50"
                              title="Historico e auditoria"
                            >
                              <FileClock className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Acoes de auditoria</h2>
              <div className="mt-4 space-y-4">
                {auditEvents.map((event) => {
                  const Icon = event.icon;
                  return (
                    <div key={`${event.title}-${event.when}`} className="flex gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
                        <Icon className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{event.title}</p>
                        <p className="mt-1 text-sm leading-5 text-zinc-500">{event.detail}</p>
                        <p className="mt-1 text-xs text-zinc-400">{event.when}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-5 text-orange-950">
              <h2 className="font-semibold">Regra de bloqueio</h2>
              <p className="mt-2 text-sm leading-6">
                No MVP, a tela mostra inadimplencia e permite bloqueio manual. A automacao de
                bloqueio apos 5 dias deve entrar com Firebase Functions agendada.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
