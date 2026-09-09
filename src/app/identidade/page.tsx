import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, Check, Palette } from "lucide-react";
import { BrandLogo, type BrandMarkVariant } from "@/components/brand-logo";

const concepts: Array<{
  id: BrandMarkVariant;
  number: string;
  name: string;
  idea: string;
  detail: string;
  bestFor: string;
}> = [
  {
    id: "essential",
    number: "01",
    name: "Essencial",
    idea: "A evolução mais fiel ao original",
    detail: "Preserva o anel azul, a abertura superior e os três pontos. O desenho foi limpo para ganhar leitura em tamanhos pequenos e ficar mais atual.",
    bestFor: "Marca principal, favicon e aplicativo",
  },
  {
    id: "orbit",
    number: "02",
    name: "Órbita",
    idea: "Uma plataforma conectando vários sistemas",
    detail: "O anel continua familiar, enquanto os três pontos passam a compartilhar uma única órbita. A composição comunica ecossistema e integração.",
    bestFor: "Portal central e ecossistema de produtos",
  },
  {
    id: "signature",
    number: "03",
    name: "Assinatura",
    idea: "O mesmo símbolo com acabamento premium",
    detail: "Refina proporções, luz e contraste mantendo a construção interna do ícone atual. É a alternativa mais sóbria para uma marca corporativa.",
    bestFor: "Apresentações, propostas e sistemas empresariais",
  },
];

export default function IdentidadePage() {
  return (
    <main className="min-h-screen bg-[#06141f] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-6 lg:px-8">
          <BrandLogo showWordmark tone="light" variant="essential" />
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Voltar ao Portal
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#56cce3]">
            <Palette className="size-4" />
            Estudo de marca
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.06] tracking-tight text-white sm:text-6xl">
            A evolução do símbolo que já representa a Orquestra.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            O original continua sendo a referência. As três propostas abaixo refinam a mesma construção, preservando o anel aberto, os tons de azul e os três pontos internos.
          </p>
        </div>

        <div className="mt-10 grid overflow-hidden rounded-lg border border-white/10 bg-[#f5f8fa] md:grid-cols-[280px_1fr]">
          <div className="flex min-h-72 items-center justify-center border-b border-slate-200 p-8 md:border-b-0 md:border-r">
            <Image
              src="/orquestra-icon-original.png"
              alt="Ícone original da Orquestra"
              width={220}
              height={220}
              className="size-52 object-contain"
              priority
            />
          </div>
          <div className="flex flex-col justify-center p-7 text-[#071b2a] sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#187fa5]">Ponto de partida</p>
            <h2 className="mt-3 text-2xl font-semibold">Símbolo original</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              A marca atual tem uma ideia forte e reconhecível. O trabalho de evolução concentra-se em proporção, nitidez, equilíbrio de luz e uso em tamanhos pequenos.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {concepts.map((concept) => (
            <article
              key={concept.id}
              className="group overflow-hidden rounded-lg border border-white/10 bg-[#0a202e] transition hover:-translate-y-1 hover:border-[#2bb9d5]/60 hover:bg-[#0b2536]"
            >
              <div className="flex min-h-64 items-center justify-center border-b border-white/10 bg-[#071b2a] p-10">
                <BrandLogo variant={concept.id} size={132} />
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold tracking-[0.18em] text-[#56cce3]">CONCEITO {concept.number}</p>
                    <h2 className="mt-2 text-2xl font-semibold">{concept.name}</h2>
                  </div>
                  <span className="flex size-8 items-center justify-center rounded-md border border-white/10 text-[#56cce3]">
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
                <p className="mt-5 font-medium text-white">{concept.idea}</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">{concept.detail}</p>
                <p className="mt-6 border-t border-white/10 pt-4 text-xs font-medium text-slate-400">
                  Melhor para: <span className="text-slate-200">{concept.bestFor}</span>
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 grid gap-4 border-t border-white/10 pt-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-white">Base visual sugerida</p>
            <p className="mt-1 text-sm text-slate-400">Azul petróleo para confiança, ciano para ação e branco para legibilidade.</p>
          </div>
          <div className="flex items-center gap-2" aria-label="Paleta de cores">
            {[
              ["#06141F", "Azul profundo"],
              ["#0D9FBE", "Ciano Orquestra"],
              ["#56CCE3", "Ciano claro"],
              ["#F4F8FA", "Branco névoa"],
            ].map(([color, label]) => (
              <span key={color} className="group relative size-9 rounded-md border border-white/15" style={{ backgroundColor: color }}>
                <span className="sr-only">{label}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 text-sm text-slate-300">
          <Check className="size-4 text-[#56cce3]" />
          Símbolos vetoriais: nítidos no app, favicon, Vercel e materiais comerciais.
        </div>
      </section>
    </main>
  );
}
