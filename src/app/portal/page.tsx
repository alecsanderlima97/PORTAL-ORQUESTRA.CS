import Link from "next/link";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { companies, formatCurrency, formatDate, products } from "@/lib/portal-data";
import { StatusPill } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";

export default function PortalPage() {
  const company = companies[0];
  const companyProducts = products.filter((product) => company.productIds.includes(product.id));

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo variant="essential" size={38} />
            <div>
              <p className="text-sm font-semibold">Orquestra.cs</p>
              <p className="text-xs text-zinc-500">Portal do cliente</p>
            </div>
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Trocar acesso
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="h-fit rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
          {[
            ["Meus sistemas", ExternalLink],
            ["Plano e vencimento", ShieldCheck],
            ["Usuários", Users],
            ["Suporte", CircleHelp],
            ["Meu perfil", UserRound],
            ["Configurações", Settings],
          ].map(([label, Icon]) => (
            <button
              key={label as string}
              className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950"
            >
              <Icon className="size-4" />
              {label as string}
            </button>
          ))}
        </aside>

        <section className="space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-medium text-zinc-500">Bem-vindo</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">{company.name}</h1>
                <p className="mt-2 text-sm text-zinc-500">
                  Tenant: {company.id} · Ultimo acesso: {company.lastAccess}
                </p>
              </div>
              <StatusPill status={company.status} />
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-md bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Plano contratado</p>
                <p className="mt-2 text-lg font-semibold">{company.plan}</p>
              </div>
              <div className="rounded-md bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Mensalidade</p>
                <p className="mt-2 text-lg font-semibold">{formatCurrency(company.monthlyFee)}</p>
              </div>
              <div className="rounded-md bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Vencimento</p>
                <p className="mt-2 text-lg font-semibold">{formatDate(company.dueDate)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-700">Sistemas liberados</p>
                  <h2 className="mt-1 text-xl font-semibold">Acessos da empresa</h2>
                </div>
                <ExternalLink className="size-5 text-zinc-400" />
              </div>
              <div className="mt-5 space-y-3">
                {companyProducts.map((product) => {
                  const Icon = product.icon;
                  return (
                    <article key={product.id} className="rounded-lg border border-zinc-200 p-4">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex size-12 items-center justify-center rounded-md ring-1 ${product.accent}`}
                          >
                            <Icon className="size-5" />
                          </span>
                          <div>
                            <h3 className="font-semibold">{product.name}</h3>
                            <p className="mt-1 text-sm text-zinc-500">{product.description}</p>
                          </div>
                        </div>
                        <a
                          href={company.externalUrl}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                        >
                          Abrir sistema
                          <ChevronRight className="size-4" />
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Bell className="size-5 text-emerald-700" />
                  <h2 className="font-semibold">Avisos</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  Seu acesso esta ativo. Proximo vencimento em {formatDate(company.dueDate)}.
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold">Suporte</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  Abra uma solicitacao para ajustes de usuarios, acesso ou financeiro.
                </p>
                <button className="mt-4 h-10 w-full rounded-md border border-zinc-200 text-sm font-semibold hover:bg-zinc-50">
                  Solicitar suporte
                </button>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <UserRound className="size-5 text-emerald-700" />
                  <h2 className="font-semibold">Meu perfil</h2>
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div><dt className="text-zinc-500">Nome</dt><dd className="mt-1 font-medium">{company.owner}</dd></div>
                  <div><dt className="text-zinc-500">Empresa</dt><dd className="mt-1 font-medium">{company.name}</dd></div>
                  <div><dt className="text-zinc-500">E-mail</dt><dd className="mt-1 font-medium">admin@empresa.com.br</dd></div>
                </dl>
                <button className="mt-4 h-10 w-full rounded-md border border-zinc-200 text-sm font-semibold hover:bg-zinc-50">Editar dados</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
