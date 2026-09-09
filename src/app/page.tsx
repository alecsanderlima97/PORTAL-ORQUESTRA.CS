import Image from "next/image";
import Link from "next/link";
import { Layers3, LockKeyhole, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { products } from "@/lib/portal-data";
import { PrimaryLink, SectionHeader, StatusPill } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-zinc-950">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-[#031323]/90 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <a href="#" aria-label="Orquestra.cs - inicio">
            <BrandLogo variant="essential" size={36} showWordmark tone="light" />
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-300 md:flex">
            <a className="transition hover:text-white" href="#solucoes">
              Soluções
            </a>
            <a className="transition hover:text-white" href="#portal">
              Portal
            </a>
            <a className="transition hover:text-white" href="#admin">
              Admin
            </a>
            <a className="transition hover:text-white" href="/identidade">
              Marca
            </a>
          </nav>
          <Link
            href="/login"
            className="rounded-md border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky-300/70 hover:bg-white/10"
          >
            Entrar
          </Link>
        </div>
      </header>

      <section className="relative flex min-h-[70svh] items-center justify-center overflow-hidden bg-[#020b15] pt-20 text-white md:min-h-[78svh]">
        <Image
          src="/orquestra-brand-portal-final-wide.png"
          alt="Orquestra.cs, um portal para toda a sua operação"
          width={1920}
          height={1080}
          preload
          unoptimized
          sizes="100vw"
          className="hidden h-[calc(78svh-5rem)] w-[86%] object-contain md:block"
        />
        <Image
          src="/orquestra-brand-portal-operacao-v24.png"
          alt=""
          width={1254}
          height={1254}
          unoptimized
          sizes="100vw"
          className="h-[calc(70svh-5rem)] w-[88%] object-contain md:hidden"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020b15]/20 via-transparent to-[#020b15]/20" />
        <h1 className="sr-only">Orquestra.cs: um portal para toda a sua operação</h1>
      </section>

      <section className="bg-[#06182a] text-white">
        <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
          <div className="max-w-3xl border-l border-sky-300/50 pl-5 sm:pl-6">
            <h2 className="text-xl font-semibold leading-tight sm:text-2xl">
              Tecnologia completa para operações comerciais, corporativas e industriais.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Consultoria, infraestrutura, equipamentos, software, sites e automação em uma
              estratégia conectada ao seu negócio.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="#solucoes"
                className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-[#06182a] transition hover:bg-sky-100"
              >
                Conhecer soluções
              </Link>
              <Link
                href="/portal"
                className="rounded-md border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:border-sky-300/70 hover:bg-white/10"
              >
                Acessar o Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="solucoes" className="border-y border-zinc-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Vitrine comercial"
            title="Cada sistema vira uma solução clara para vender."
            description="O cliente entende o produto antes de entrar em contato. Depois de contratado, ele acessa apenas os módulos liberados para a empresa dele."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const Icon = product.icon;
              return (
                <article
                  key={product.id}
                  className="group rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-zinc-200/70"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`flex size-11 items-center justify-center rounded-md ring-1 ${product.accent}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <StatusPill status={product.status} />
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                    {product.category}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight">{product.name}</h3>
                  <p className="mt-3 min-h-24 text-sm leading-6 text-zinc-600">
                    {product.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {product.features.map((feature) => (
                      <span
                        key={feature}
                        className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="portal" className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <SectionHeader
            eyebrow="Area do cliente"
            title="O cliente entra e ve apenas o que contratou."
            description="Na primeira fase, os sistemas continuam hospedados separadamente. O portal controla permissão, status comercial e o link correto para abrir cada sistema."
          />
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div>
              <p className="text-sm text-zinc-500">Empresa</p>
              <h3 className="text-xl font-semibold">Serraria Vanmarte</h3>
            </div>
            <StatusPill status="ativo" />
          </div>
          <div className="grid gap-3 py-4 sm:grid-cols-3">
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Plano</p>
              <p className="mt-1 font-semibold">Profissional</p>
            </div>
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Vencimento</p>
              <p className="mt-1 font-semibold">10/09/2026</p>
            </div>
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Usuarios</p>
              <p className="mt-1 font-semibold">8 ativos</p>
            </div>
          </div>
          <div className="rounded-md border border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <Layers3 className="size-5" />
              </span>
              <div>
                <p className="font-semibold">Orquestra Madeira / Serraria</p>
                <p className="text-sm text-zinc-500">Acesso externo liberado</p>
              </div>
            </div>
            <div className="mt-4">
              <PrimaryLink href="/portal">Abrir sistema</PrimaryLink>
            </div>
          </div>
        </div>
      </section>

      <section id="admin" className="bg-zinc-950 py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
              Sua gestao
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Uma Central Admin para enxergar todos os clientes.
            </h2>
            <p className="mt-4 leading-7 text-zinc-300">
              Diferente do admin dentro de cada sistema, esta central controla a carteira SaaS:
              plano, mensalidade, vencimento, status, módulos liberados, usuários e links.
            </p>
            <div className="mt-8">
              <PrimaryLink href="/central-admin">Abrir Central Admin</PrimaryLink>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            {[
              ["Tenant isolado", "empresaId obrigatório em empresas, usuários e módulos", LockKeyhole],
              ["Bloqueio comercial", "inadimplência acompanha vencimento + 5 dias", SlidersHorizontal],
              ["Auditoria", "registro de pagamentos, acessos, liberacoes e suporte", ShieldCheck],
            ].map(([title, detail, Icon]) => (
              <div key={title as string} className="flex gap-4 border-b border-white/10 py-4 last:border-b-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white text-zinc-950">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{title as string}</p>
                  <p className="mt-1 text-sm text-zinc-300">{detail as string}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
