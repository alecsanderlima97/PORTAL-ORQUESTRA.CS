"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown, LockKeyhole, Mail, MessageCircle } from "lucide-react";
import { products } from "@/lib/portal-data";
import { BrandLogo } from "@/components/brand-logo";

import { useCallback, useEffect, useState } from "react";

type GatewayPhase = "arrival" | "entering" | "inside";

const solutionGroups = [
  {
    title: "Sistemas de operação",
    description: "Produtos preparados para rotinas que precisam de controle e velocidade.",
    ids: ["madeira", "auto", "beleza", "food", "ponto"],
  },
  {
    title: "Gestão e crescimento",
    description: "Informação organizada para decidir melhor e vender com consistência.",
    ids: ["hub", "comercial"],
  },
];

function playPortalChoralTone() {
  const AudioContextConstructor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) return;

  const context = new AudioContextConstructor();
  const now = context.currentTime;
  const master = context.createGain();
  const filter = context.createBiquadFilter();

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1500, now);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.055, now + 0.12);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);

  filter.connect(master);
  master.connect(context.destination);

  [130.81, 196, 261.63].forEach((frequency, index) => {
    const voice = context.createOscillator();
    const voiceGain = context.createGain();
    voice.type = index === 0 ? "sine" : "triangle";
    voice.frequency.setValueAtTime(frequency, now);
    voice.detune.setValueAtTime(index * 4 - 4, now);
    voiceGain.gain.setValueAtTime(index === 0 ? 0.72 : 0.32, now);
    voice.connect(voiceGain);
    voiceGain.connect(filter);
    voice.start(now);
    voice.stop(now + 1.1);
  });

  window.setTimeout(() => void context.close(), 1400);
}

export function PortalLanding() {
  const [phase, setPhase] = useState<GatewayPhase>("arrival");

  const enterPortal = useCallback(() => {
    if (phase !== "arrival") return;
    playPortalChoralTone();
    setPhase("entering");
    window.setTimeout(() => setPhase("inside"), 1500);
  }, [phase]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Enter" || event.key === " ") && phase === "arrival") {
        event.preventDefault();
        enterPortal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enterPortal, phase]);

  return (
    <main className={`portal-shell portal-shell--${phase}`}>
      <button
        type="button"
        className="portal-gateway"
        onClick={enterPortal}
        aria-label="Entrar no Portal Orquestra.cs"
        aria-hidden={phase === "inside"}
        tabIndex={phase === "inside" ? -1 : 0}
      >
        <span className="portal-gateway__scene" aria-hidden="true">
          <Image
            src="/orquestra-portal-brand-composition.png"
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            className="portal-gateway__image"
          />
          <span className="portal-gateway__veil" />
          <span className="portal-gateway__focus" />
          <span className="portal-gateway__light-sweep" />
          <span className="portal-gateway__transition-light" />
        </span>
        <span className="portal-gateway__content">
          <span className="portal-gateway__prompt">
            <span>Acessar plataforma</span>
            <ChevronDown className="size-4" />
          </span>
          <span className="portal-gateway__hint">Clique para entrar</span>
        </span>
      </button>

      <div className="portal-site" aria-hidden={phase !== "inside"}>
        <header className="portal-header">
          <Link href="/" className="portal-header__brand" aria-label="Orquestra.cs - início">
            <BrandLogo variant="essential" size={34} showWordmark tone="light" />
          </Link>
          <nav className="portal-header__nav" aria-label="Navegação principal">
            <a href="#solucoes">Soluções</a>
            <a href="#servicos">Consultoria</a>
            <a href="#planos">Planos</a>
            <a href="#sobre">Quem somos</a>
          </nav>
          <Link href="/login" className="portal-header__login">
            Entrar
          </Link>
        </header>

        <section className="portal-home" id="empresa">
          <div className="portal-home__copy">
            <p className="portal-eyebrow">Tecnologia para fazer sua operação avançar</p>
            <h1>A chave para uma operação que funciona.</h1>
            <p className="portal-home__intro">
              Da escolha dos equipamentos ao desenvolvimento do software, site ou automação: uma
              direção tecnológica para resolver o que trava o seu negócio.
            </p>
            <div className="portal-home__actions">
              <a href="#orcamento" className="portal-action portal-action--primary">
                Fazer um orçamento <ArrowRight className="size-4" />
              </a>
              <Link href="/portal" className="portal-action portal-action--quiet">Área do cliente</Link>
            </div>
          </div>

          <div className="portal-home__signal" aria-hidden="true">
            <span className="portal-home__signal-line" />
            <span>Orquestra.cs</span>
            <span>comercial · corporativo · industrial</span>
          </div>
        </section>

        <section className="portal-solutions" id="solucoes">
          <div className="portal-solutions__heading">
            <p className="portal-eyebrow">Soluções</p>
            <h2>Escolha a frente que precisa avançar.</h2>
            <p className="portal-section-intro">Sistemas independentes, feitos para a realidade de cada operação.</p>
          </div>
          <div className="portal-solutions__list">
            {solutionGroups.map((group) => (
              <div className="portal-solution-group" key={group.title}>
                <div className="portal-solution-group__heading">
                  <h3>{group.title}</h3>
                  <p>{group.description}</p>
                </div>
                {group.ids.map((id) => {
                  const product = products.find((item) => item.id === id);
                  if (!product) return null;
                  const Icon = product.icon;
                  return (
                    <Link href="/login" className="portal-solution" key={product.id}>
                      <span className="portal-solution__icon"><Icon className="size-4" /></span>
                      <span className="portal-solution__name">{product.name}</span>
                      <span className="portal-solution__category">{product.audience}</span>
                      <ArrowRight className="portal-solution__arrow size-4" />
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <section className="portal-services" id="servicos">
          <div className="portal-services__heading">
            <p className="portal-eyebrow">Como ajudamos</p>
            <h2>Do problema à solução em uma única direção.</h2>
          </div>
          <div className="portal-services__list">
            <article><span>01</span><h3>Consultoria</h3><p>Entendemos sua operação, identificamos gargalos e desenhamos o caminho mais inteligente.</p></article>
            <article><span>02</span><h3>Infraestrutura</h3><p>Equipamentos, rede e ambiente preparados para a sua empresa trabalhar com segurança.</p></article>
            <article><span>03</span><h3>Software e automação</h3><p>Sistemas, sites e fluxos digitais personalizados para reduzir esforço e dar clareza.</p></article>
          </div>
        </section>

        <section className="portal-plans" id="planos">
          <div>
            <p className="portal-eyebrow">Planos e projetos</p>
            <h2>Comece pelo que sua operação precisa hoje.</h2>
          </div>
          <div className="portal-plans__items">
            <div><span>Essencial</span><strong>Uma solução para organizar a rotina.</strong><p>Ideal para começar com um sistema objetivo e suporte próximo.</p></div>
            <div><span>Profissional</span><strong>Mais controle para uma operação em crescimento.</strong><p>Módulos, usuários e acompanhamento para ganhar escala.</p></div>
            <div><span>Sob medida</span><strong>A tecnologia desenhada para o seu cenário.</strong><p>Consultoria, infraestrutura e desenvolvimento integrado.</p></div>
          </div>
        </section>

        <section className="portal-about" id="sobre">
          <div>
            <p className="portal-eyebrow">Quem somos</p>
            <h2>A Orquestra.cs resolve problemas através de tecnologia.</h2>
          </div>
          <p>Somos uma empresa de consultoria, infraestrutura comercial, corporativa e industrial. Unimos visão de negócio, equipamentos, software e automação para transformar complexidade em uma operação mais clara, segura e eficiente.</p>
        </section>

        <section className="portal-contact" id="orcamento">
          <div className="portal-contact__copy">
            <p className="portal-eyebrow">Vamos conversar</p>
            <h2>Conte o que sua empresa precisa resolver.</h2>
            <p>Receba uma orientação inicial para escolher o sistema, projeto ou estrutura mais adequada.</p>
          </div>
          <div className="portal-contact__actions">
            <a href="mailto:orquestracs@gmail.com?subject=Orçamento Orquestra.cs" className="portal-action portal-action--primary"><Mail className="size-4" /> Solicitar orçamento</a>
            <a href="mailto:orquestracs@gmail.com?subject=Suporte Orquestra.cs" className="portal-action portal-action--quiet"><MessageCircle className="size-4" /> Falar com suporte</a>
            <span>orquestracs@gmail.com</span>
          </div>
        </section>

        <footer className="portal-footer">
          <span>Orquestra.cs</span>
          <span className="portal-footer__secure"><LockKeyhole className="size-3.5" /> Acesso seguro por empresa</span>
          <Link href="/portal">Área do cliente</Link>
          <Link href="/central-admin">Central Admin</Link>
        </footer>
      </div>
    </main>
  );
}
