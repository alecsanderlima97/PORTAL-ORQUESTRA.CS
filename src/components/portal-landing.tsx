"use client";

import Image from "next/image";
import Link from "next/link";
import { Activity, ArrowRight, ChevronDown, LockKeyhole, Mail, MessageCircle, Network, Workflow } from "lucide-react";
import gsap from "gsap";
import { deployedProjects, projectCatalogDetails } from "@/lib/portal-data";
import { BrandLogo } from "@/components/brand-logo";
import { PortalGravityField, PortalWarpCanvas } from "@/components/portal-visual-effects";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type GatewayPhase = "arrival" | "entering" | "inside";

const solutionGroups = [
  {
    title: "Sistemas de operação",
    description: "Sistemas reais publicados para organizar rotinas e ganhar clareza.",
    ids: ["sistema-serraria", "orquestracs-face-id", "orquestra-fit", "orquestra-auto-detail"],
  },
  {
    title: "Gestão e ecossistema",
    description: "Produtos que conectam gestão, madeira, serviços e crescimento.",
    ids: ["orquestra-hub", "orquestra-studio", "orquestra-blend", "orquestra-moda"],
  },
];

const heroNavigation = [
  {
    id: "solucoes",
    label: "Soluções",
    detail: "Tecnologia sob medida",
    href: "#solucoes",
    position: "northwest",
    icon: Network,
  },
  {
    id: "sistemas-publicados",
    label: "Sistemas publicados",
    detail: "Produtos reais",
    href: "#solucoes",
    position: "northeast",
    icon: Activity,
  },
  {
    id: "consultoria",
    label: "Consultoria",
    detail: "Estratégia e operação",
    href: "#servicos",
    position: "east",
    icon: MessageCircle,
  },
  {
    id: "planos",
    label: "Planos",
    detail: "Caminhos para começar",
    href: "#planos",
    position: "southeast",
    icon: Workflow,
  },
  {
    id: "quem-somos",
    label: "Quem somos",
    detail: "A Orquestra.cs",
    href: "#sobre",
    position: "southwest",
    icon: LockKeyhole,
  },
] as const;

function playPortalTransitionSound() {
  const AudioContextConstructor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) return;

  const context = new AudioContextConstructor();
  const now = context.currentTime;
  const master = context.createGain();
  const filter = context.createBiquadFilter();

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.exponentialRampToValueAtTime(2100, now + 2.1);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.045, now + 0.22);
  master.gain.exponentialRampToValueAtTime(0.018, now + 1.65);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 2.72);

  filter.connect(master);
  master.connect(context.destination);

  [146.83, 220, 293.66].forEach((frequency, index) => {
    const voice = context.createOscillator();
    const voiceGain = context.createGain();
    voice.type = index === 0 ? "sine" : "triangle";
    voice.frequency.setValueAtTime(frequency, now);
    voice.detune.setValueAtTime(index * 4 - 4, now);
    voiceGain.gain.setValueAtTime(index === 0 ? 0.62 : 0.26, now);
    voice.connect(voiceGain);
    voiceGain.connect(filter);
    voice.start(now);
    voice.stop(now + 2.75);
  });

  const noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * 2.65), context.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let index = 0; index < noiseData.length; index += 1) {
    noiseData[index] = (Math.random() * 2 - 1) * (1 - index / noiseData.length);
  }

  const noise = context.createBufferSource();
  const noiseFilter = context.createBiquadFilter();
  const noiseGain = context.createGain();
  noise.buffer = noiseBuffer;
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(240, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(1700, now + 2.35);
  noiseFilter.Q.setValueAtTime(0.55, now);
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.018, now + 1.72);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.62);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(context.destination);
  noise.start(now);
  noise.stop(now + 2.65);

  void context.resume();
  window.setTimeout(() => void context.close(), 3900);
}

export function PortalLanding() {
  const [phase, setPhase] = useState<GatewayPhase>("arrival");
  const [activeNavigationId, setActiveNavigationId] = useState<(typeof heroNavigation)[number]["id"]>("solucoes");
  const transitionTimerRef = useRef<number | null>(null);
  const gatewayRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const veilRef = useRef<HTMLSpanElement>(null);
  const apertureRef = useRef<HTMLSpanElement>(null);
  const transitionLightRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const siteRef = useRef<HTMLDivElement>(null);
  const orchestratorRef = useRef<HTMLDivElement>(null);
  const orchestratorGlowRef = useRef<HTMLSpanElement>(null);
  const activeNavigation = heroNavigation.find((item) => item.id === activeNavigationId) ?? heroNavigation[0];

  const enterPortal = useCallback(() => {
    if (phase !== "arrival") return;
    playPortalTransitionSound();
    setPhase("entering");
  }, [phase]);

  useLayoutEffect(() => {
    if (phase !== "entering") return;

    const gateway = gatewayRef.current;
    const image = imageRef.current;
    const veil = veilRef.current;
    const aperture = apertureRef.current;
    const transitionLight = transitionLightRef.current;
    const content = contentRef.current;
    if (!gateway || !image || !veil || !aperture || !transitionLight || !content) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      transitionTimerRef.current = window.setTimeout(() => setPhase("inside"), 420);
      return () => {
        if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
      };
    }

    let completed = false;
    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          completed = true;
          setPhase("inside");
        },
      });

      timeline
        .to(content, { autoAlpha: 0, scale: 1.025, duration: 0.32, ease: "power2.out" }, 0)
        .to(veil, { opacity: 0.02, duration: 1.08, ease: "power2.out" }, 0)
        .to(
          image,
          {
            scale: 1.09,
            filter: "saturate(0.92) brightness(1.06) contrast(1.01) blur(0px)",
            duration: 1.04,
            ease: "power2.inOut",
          },
          0,
        )
        .to(aperture, { autoAlpha: 0.78, scale: 1.06, duration: 0.7, ease: "power2.out" }, 0.1)
        .to(aperture, { scale: 1.72, filter: "brightness(1.3)", duration: 1.3, ease: "power3.in" }, 0.72)
        .to(
          image,
          {
            autoAlpha: 0.08,
            scale: 1.9,
            filter: "saturate(0.95) brightness(1.32) contrast(0.94) blur(5px)",
            duration: 2.2,
            ease: "power4.in",
          },
          0.92,
        )
        .to(aperture, { autoAlpha: 0, scale: 4.7, duration: 1.72, ease: "power4.in" }, 1.05)
        .fromTo(
          transitionLight,
          { autoAlpha: 0, scale: 0.2 },
          { autoAlpha: 1, scale: 3.15, duration: 1.28, ease: "power3.in" },
          2.05,
        );
    }, gateway);

    // Keep the final light frame while CSS fades the gateway out.
    return () => {
      if (completed) context.kill(false);
      else context.revert();
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "inside") siteRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    const character = orchestratorRef.current;
    const glow = orchestratorGlowRef.current;
    if (phase !== "inside" || !character || !glow || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let removePointerListener: (() => void) | undefined;
    const context = gsap.context(() => {
      gsap.from(character, { autoAlpha: 0, xPercent: 8, scale: 0.97, duration: 1.35, ease: "power3.out" });
      gsap.fromTo(glow, { opacity: 0.28, scale: 0.92 }, { opacity: 0.62, scale: 1.08, duration: 1.7, ease: "sine.inOut" });

      if (window.matchMedia("(pointer: fine)").matches) {
        const moveX = gsap.quickTo(character, "x", { duration: 0.9, ease: "power3.out" });
        const moveY = gsap.quickTo(character, "y", { duration: 0.9, ease: "power3.out" });
        const handlePointerMove = (event: PointerEvent) => {
          moveX((event.clientX / window.innerWidth - 0.5) * 12);
          moveY((event.clientY / window.innerHeight - 0.5) * 8);
        };
        window.addEventListener("pointermove", handlePointerMove, { passive: true });
        removePointerListener = () => window.removeEventListener("pointermove", handlePointerMove);
      }
    }, siteRef);

    return () => {
      removePointerListener?.();
      context.revert();
    };
  }, [phase]);

  useEffect(
    () => () => {
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    },
    [],
  );

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
        ref={gatewayRef}
        type="button"
        className="portal-gateway"
        onClick={enterPortal}
        aria-label="Entrar no Portal Orquestra.cs"
        aria-hidden={phase === "inside"}
        tabIndex={phase === "inside" ? -1 : 0}
      >
        <span className="portal-gateway__scene" aria-hidden="true">
          <Image
            ref={imageRef}
            src="/orquestra-portal-altar-clean.png"
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            className="portal-gateway__image"
          />
          <span ref={veilRef} className="portal-gateway__veil" />
          <span className="portal-gateway__focus" />
          <span className="portal-gateway__light-sweep" />
          <span ref={apertureRef} className="portal-gateway__aperture">
            <span className="portal-gateway__aperture-halo" />
            <span className="portal-gateway__aperture-core" />
          </span>
          <span className="portal-gateway__depth" />
          {phase === "entering" && <PortalWarpCanvas active />}
          <span ref={transitionLightRef} className="portal-gateway__transition-light" />
        </span>
        <span ref={contentRef} className="portal-gateway__content">
          <BrandLogo variant="essential" size={54} showWordmark tone="light" />
          <span className="portal-gateway__prompt">
            <span>Acessar plataforma</span>
            <ChevronDown className="size-4" />
          </span>
          <span className="portal-gateway__hint">Clique para entrar</span>
        </span>
      </button>

      <div ref={siteRef} className="portal-site" tabIndex={-1} inert={phase !== "inside"} aria-hidden={phase !== "inside"}>
        {phase !== "arrival" && <PortalGravityField />}
        <header className="portal-header">
          <Link href="/" className="portal-header__brand" aria-label="Orquestra.cs - início">
            <BrandLogo variant="essential" size={34} showWordmark tone="light" />
          </Link>
          <nav className="portal-header__nav" aria-label="Navegação principal">
            <a href="#solucoes">Soluções</a>
            <a href="#solucoes">Sistemas publicados</a>
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

          <div
            className="portal-home__orchestrator"
            aria-label="Orquestrador digital da Orquestra.cs"
            data-active-navigation={activeNavigation.id}
          >
            <span ref={orchestratorGlowRef} className="portal-home__orchestrator-glow" aria-hidden="true" />
            <span className="portal-orbit-field" aria-hidden="true">
              <span className="portal-orbit-field__ring portal-orbit-field__ring--outer" />
              <span className="portal-orbit-field__ring portal-orbit-field__ring--inner" />
              <span className="portal-orbit-field__beam portal-orbit-field__beam--one" />
              <span className="portal-orbit-field__beam portal-orbit-field__beam--two" />
              <span className="portal-orbit-field__pulse" />
            </span>

            {heroNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeNavigation.id;

              return (
                <a
                  key={item.id}
                  href={item.href}
                  className={`portal-orbit-node portal-orbit-node--${item.position}`}
                  data-active={isActive}
                  onPointerEnter={() => setActiveNavigationId(item.id)}
                  onFocus={() => setActiveNavigationId(item.id)}
                  aria-label={`Ir para ${item.label}: ${item.detail}`}
                >
                  <span className="portal-orbit-node__icon"><Icon className="size-3.5" /></span>
                  <span className="portal-orbit-node__content">
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                </a>
              );
            })}

            <div ref={orchestratorRef} className="portal-home__orchestrator-figure">
              <Image
                src="/orquestra-motion-conductor.png"
                alt="Orquestrador, personagem que representa os sistemas trabalhando em conjunto"
                fill
                priority
                sizes="(max-width: 720px) 60vw, 420px"
                className="portal-home__orchestrator-image"
              />
            </div>
            <div className="portal-orchestrator-panel">
              <div className="portal-orchestrator-panel__status"><span /> Navegação ativa</div>
              <div className="portal-orchestrator-panel__message">
                <Network className="size-4" />
                <span>{activeNavigation.label}: {activeNavigation.detail}</span>
              </div>
              <div className="portal-orchestrator-panel__signals">
                <span><Workflow className="size-3.5" /> Portal integrado</span>
                <span><Activity className="size-3.5" /> Em sintonia</span>
              </div>
            </div>
          </div>
        </section>

        <section className="portal-solutions" id="solucoes">
          <div className="portal-solutions__heading">
            <p className="portal-eyebrow">Sistemas publicados</p>
            <h2>Produtos reais da Orquestra.cs.</h2>
            <p className="portal-section-intro">Cada sistema nasce para resolver uma rotina específica e pode evoluir com a operação.</p>
          </div>
          <div className="portal-solutions__list">
            {solutionGroups.map((group) => (
              <div className="portal-solution-group" key={group.title}>
                <div className="portal-solution-group__heading">
                  <h3>{group.title}</h3>
                  <p>{group.description}</p>
                </div>
                {group.ids.map((id) => {
                  const project = deployedProjects.find((item) => item.id === id);
                  if (!project) return null;
                  const Icon = project.icon;
                  const solutionContent = (
                    <>
                      <span className="portal-solution__icon"><Icon className="size-4" /></span>
                      <span className="portal-solution__name">{project.name}</span>
                      <span className="portal-solution__category">{project.category}</span>
                      <span className={`portal-solution__status portal-solution__status--${project.availability}`}>
                        {project.availability === "online" ? "Online" : project.availability === "offline" ? "Offline" : "A verificar"}
                      </span>
                      <ArrowRight className="portal-solution__arrow size-4" />
                    </>
                  );
                  return project.url ? <a href={project.url} target="_blank" rel="noreferrer" className="portal-solution" key={project.id}>{solutionContent}</a> : <div className="portal-solution portal-solution--disabled" key={project.id}>{solutionContent}</div>;
                })}
              </div>
            ))}
          </div>
          <div className="portal-catalog" aria-label="Detalhes dos sistemas e projetos">
            <div className="portal-catalog__heading">
              <p className="portal-eyebrow">Conheça por dentro</p>
              <h2>Uma solução para cada tipo de operação.</h2>
              <p className="portal-section-intro">Veja para quem cada produto foi pensado e o que ele ajuda a organizar.</p>
            </div>
            <div className="portal-catalog__grid">
              {deployedProjects.filter((project) => project.relation !== "site").map((project) => {
                const details = projectCatalogDetails[project.id];
                if (!details) return null;
                const Icon = project.icon;
                return (
                  <article className="portal-catalog-card" key={project.id}>
                    {details.previewImage ? <div className="portal-catalog-card__media"><Image src={details.previewImage} alt={details.previewAlt || project.name} fill sizes="(max-width: 900px) 100vw, 360px" /></div> : <div className="portal-catalog-card__media portal-catalog-card__media--empty"><Icon className="size-8" /><span>Prévia de interface em preparação</span></div>}
                    <div className="portal-catalog-card__body">
                      <div className="portal-catalog-card__meta"><span>{project.category}</span><span>{project.relation === "cliente_ativo" ? "Cliente ativo" : project.relation === "site" ? "Site" : "Produto próprio"}</span></div>
                      <h3>{project.name}</h3>
                      <p>{project.description}</p>
                      <p className="portal-catalog-card__audience"><strong>Indicado para:</strong> {details.audience}</p>
                      <ul>{details.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>
                      {details.previewKind === "ambiente" ? <small>Prévia visual real do projeto. Capturas das telas entram na próxima etapa.</small> : null}
                    </div>
                  </article>
                );
              })}
            </div>
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
