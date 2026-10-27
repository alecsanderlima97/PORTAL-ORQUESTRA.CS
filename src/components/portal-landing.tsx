"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, LockKeyhole, Mail, MessageCircle } from "lucide-react";
import gsap from "gsap";
import { deployedProjects, projectCatalogDetails } from "@/lib/portal-data";
import { BrandLogo } from "@/components/brand-logo";
import { PortalWarpCanvas } from "@/components/portal-visual-effects";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, WheelEvent as ReactWheelEvent } from "react";

type GatewayPhase = "arrival" | "entering" | "inside";
type EntranceMode = "video" | "procedural";

const PORTAL_ASSET_VERSION = "20261027";

const heroProjects = deployedProjects.filter((project) => project.status !== "legado" && project.relation !== "site");
const initialHeroProjectIndex = Math.max(heroProjects.findIndex((project) => project.id === "orquestra-hub"), 0);

function getCircularOffset(index: number, activeIndex: number, total: number) {
  let offset = (index - activeIndex + total) % total;
  if (offset > total / 2) offset -= total;
  return offset;
}

const solutionGroups = [
  {
    title: "Controle da operação",
    description: "Produção, equipes, academias e serviços sob controle.",
    ids: ["sistema-serraria", "orquestracs-face-id", "orquestra-fit", "orquestra-auto-detail"],
  },
  {
    title: "Soluções para negócios",
    description: "Financeiro, beleza, bares, adegas e moda com gestão especializada.",
    ids: ["orquestra-hub", "orquestra-studio", "orquestra-blend", "orquestra-moda"],
  },
];

const serviceCards = [
  {
    number: "01",
    title: "Consultoria",
    description: "Entendemos sua operação, identificamos gargalos e desenhamos o caminho mais inteligente.",
    image: "/orquestra-consultoria-v1.png",
    imageAlt: "Consultores analisando o planejamento de uma operação",
  },
  {
    number: "02",
    title: "Infraestrutura",
    description: "Equipamentos, rede e ambiente preparados para a sua empresa trabalhar com segurança.",
    image: "/orquestra-infraestrutura-v2.png",
    imageAlt: "Infraestrutura industrial e operação de produção",
  },
  {
    number: "03",
    title: "Software e automação",
    description: "Sistemas, sites e fluxos digitais personalizados para reduzir esforço e dar clareza.",
    image: "/orquestra-software-automacao-v2.png",
    imageAlt: "Interface de gestão e automação empresarial",
  },
];

export function PortalLanding() {
  const [phase, setPhase] = useState<GatewayPhase>("arrival");
  const [entranceMode, setEntranceMode] = useState<EntranceMode>("video");
  const [entranceVideoReady, setEntranceVideoReady] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(initialHeroProjectIndex);
  const transitionTimerRef = useRef<number | null>(null);
  const carouselWheelTimerRef = useRef<number | null>(null);
  const gatewayRef = useRef<HTMLDivElement>(null);
  const entranceVideoRef = useRef<HTMLVideoElement>(null);
  const veilRef = useRef<HTMLSpanElement>(null);
  const transitionLightRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const siteRef = useRef<HTMLDivElement>(null);
  const commandSceneRef = useRef<HTMLDivElement>(null);
  const commandSceneImageRef = useRef<HTMLImageElement>(null);
  const commandSceneGlowRef = useRef<HTMLSpanElement>(null);
  const commandSceneFloorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const video = entranceVideoRef.current;
    if (!video) return;

    const markVideoReady = () => {
      setEntranceVideoReady(true);
    };

    const startVideoPreview = () => {
      video.muted = true;
      void video.play().catch(() => undefined);
      if (video.readyState >= 2) markVideoReady();
    };
    const confirmPortalFrame = () => {
      markVideoReady();
    };
    video.addEventListener("loadedmetadata", startVideoPreview);
    video.addEventListener("loadeddata", confirmPortalFrame);
    video.addEventListener("canplay", confirmPortalFrame);
    if (video.readyState >= 1) startVideoPreview();

    return () => {
      video.removeEventListener("loadedmetadata", startVideoPreview);
      video.removeEventListener("loadeddata", confirmPortalFrame);
      video.removeEventListener("canplay", confirmPortalFrame);
    };
  }, []);

  const enterPortal = useCallback(() => {
    if (phase !== "arrival") return;

    const entranceVideo = entranceVideoRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canPlayVideo = !reducedMotion && Boolean(entranceVideo);
    setEntranceMode(canPlayVideo ? "video" : "procedural");

    if (canPlayVideo && entranceVideo) {
      if (entranceVideo.ended) entranceVideo.currentTime = 0;
      entranceVideo.muted = false;
      entranceVideo.volume = 0.72;
      entranceVideo.playbackRate = 1.45;
      void entranceVideo.play().catch(() => {
        entranceVideo.muted = true;
        setEntranceMode("procedural");
      });
    }

    setPhase("entering");
  }, [phase]);

  const skipEntrance = useCallback(() => {
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = null;
    entranceVideoRef.current?.pause();
    gsap.killTweensOf([
      gatewayRef.current,
      veilRef.current,
      transitionLightRef.current,
      contentRef.current,
      siteRef.current,
    ]);
    setPhase("inside");
  }, []);

  const rotateCarousel = useCallback((direction: number) => {
    setCarouselIndex((current) => (current + direction + heroProjects.length) % heroProjects.length);
  }, []);

  const handleCarouselWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    const movement = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(movement) < 8 || carouselWheelTimerRef.current !== null) return;
    event.preventDefault();
    rotateCarousel(movement > 0 ? 1 : -1);
    carouselWheelTimerRef.current = window.setTimeout(() => {
      carouselWheelTimerRef.current = null;
    }, 360);
  }, [rotateCarousel]);

  useLayoutEffect(() => {
    if (phase !== "entering") return;

    const gateway = gatewayRef.current;
    const veil = veilRef.current;
    const transitionLight = transitionLightRef.current;
    const content = contentRef.current;
    const site = siteRef.current;
    if (!gateway || !veil || !transitionLight || !content || !site) return;

    if (entranceMode === "video") {
      const entranceVideo = entranceVideoRef.current;
      const fallbackDuration = 4200;
      const remainingDuration = entranceVideo && Number.isFinite(entranceVideo.duration) && entranceVideo.duration > 0
        ? Math.max((entranceVideo.duration - entranceVideo.currentTime) / entranceVideo.playbackRate, 0.4)
        : fallbackDuration / 1000;
      const duration = entranceVideo
        ? Math.ceil(remainingDuration * 1000) + 180
        : fallbackDuration;
      let completed = false;
      let crossfadeStarted = false;
      let crossfadeTimeline: gsap.core.Timeline | null = null;

      const context = gsap.context(() => {
        gsap.timeline({ defaults: { overwrite: "auto" } })
          .to(content, { autoAlpha: 0, scale: 1.02, duration: 0.32, ease: "power2.out" }, 0)
          .to(veil, { opacity: 0.02, duration: 0.8, ease: "power2.out" }, 0);
      }, gateway);

      const startCrossfade = () => {
        if (crossfadeStarted) return;
        crossfadeStarted = true;
        crossfadeTimeline = gsap.timeline({
          defaults: { overwrite: "auto" },
          onComplete: () => {
            completed = true;
            setPhase("inside");
          },
        })
          .set([gateway, site], { transition: "none" })
          .to(site, { opacity: 1, duration: 0.82, ease: "power2.inOut" }, 0)
          .to(gateway, { opacity: 0, duration: 0.82, ease: "power2.inOut" }, 0);
      };

      entranceVideo?.addEventListener("ended", startCrossfade, { once: true });
      transitionTimerRef.current = window.setTimeout(startCrossfade, duration + 900);
      return () => {
        entranceVideo?.removeEventListener("ended", startCrossfade);
        if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
        if (!completed) crossfadeTimeline?.kill();
        if (completed) context.kill(false);
        else context.revert();
      };
    }

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
  }, [entranceMode, phase]);

  useEffect(() => {
    if (phase === "inside") siteRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    const scene = commandSceneRef.current;
    const image = commandSceneImageRef.current;
    const glow = commandSceneGlowRef.current;
    const floor = commandSceneFloorRef.current;
    if (phase !== "inside" || !scene || !image || !glow || !floor || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let removePointerListener: (() => void) | undefined;
    const context = gsap.context(() => {
      gsap.fromTo(scene, { autoAlpha: 0, scale: 1.025 }, { autoAlpha: 1, scale: 1, duration: 1.8, ease: "power2.out" });

      if (window.matchMedia("(pointer: fine) and (min-width: 901px)").matches) {
        const imageX = gsap.quickTo(image, "x", { duration: 1.4, ease: "power2.out" });
        const imageY = gsap.quickTo(image, "y", { duration: 1.4, ease: "power2.out" });
        const glowX = gsap.quickTo(glow, "x", { duration: 1.1, ease: "power2.out" });
        const floorX = gsap.quickTo(floor, "x", { duration: 1.8, ease: "power2.out" });
        const handlePointerMove = (event: PointerEvent) => {
          const normalizedX = event.clientX / window.innerWidth - 0.5;
          const normalizedY = event.clientY / window.innerHeight - 0.5;
          imageX(normalizedX * -22);
          imageY(normalizedY * -13);
          glowX(normalizedX * 34);
          floorX(normalizedX * 18);
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
      if (carouselWheelTimerRef.current !== null) window.clearTimeout(carouselWheelTimerRef.current);
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
    <main className={`portal-shell portal-shell--${phase} portal-shell--${entranceMode} ${entranceVideoReady ? "portal-shell--video-ready" : ""} ${phase === "inside" ? "portal-shell--powering" : ""}`}>
      <div
        ref={gatewayRef}
        className="portal-gateway"
        onClick={enterPortal}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            enterPortal();
          }
        }}
        role="button"
        aria-label="Entrar no Portal Orquestra.cs"
        aria-hidden={phase === "inside"}
        tabIndex={phase === "inside" ? -1 : 0}
      >
        <span className="portal-gateway__scene" aria-hidden="true">
          <video
            ref={entranceVideoRef}
            className="portal-gateway__video"
            src={`/portal-entry-room.mp4?v=${PORTAL_ASSET_VERSION}`}
            playsInline
            autoPlay
            muted
            preload="auto"
            aria-hidden="true"
            onCanPlay={() => setEntranceVideoReady(true)}
            onError={() => {
              setEntranceVideoReady(false);
              setEntranceMode("procedural");
            }}
          />
          <span ref={veilRef} className="portal-gateway__veil" />
          <span className="portal-gateway__focus" />
          <span className="portal-gateway__light-sweep" />
          <span className="portal-gateway__depth" />
          {phase === "entering" && entranceMode === "procedural" && <PortalWarpCanvas active />}
          <span ref={transitionLightRef} className="portal-gateway__transition-light" />
        </span>
        <span ref={contentRef} className="portal-gateway__content">
          <BrandLogo variant="essential" size={54} showWordmark tone="light" />
          <span className="portal-gateway__hint">Clique para entrar</span>
        </span>
        <button type="button" className="portal-gateway__skip" onClick={(event) => { event.stopPropagation(); skipEntrance(); }}>
          Pular entrada
        </button>
      </div>

      <div ref={siteRef} className="portal-site" tabIndex={-1} inert={phase !== "inside"} aria-hidden={phase !== "inside"}>
        <div className="portal-site__hero">
          <div ref={commandSceneRef} className="portal-command-scene" aria-hidden="true">
            <Image
              ref={commandSceneImageRef}
              src={`/orquestra-command-room-reference-v1.png?v=${PORTAL_ASSET_VERSION}`}
              alt=""
              fill
              priority
              unoptimized
              sizes="100vw"
              className="portal-command-scene__image"
            />
            <span ref={commandSceneGlowRef} className="portal-command-scene__ceiling-glow" />
            <span ref={commandSceneFloorRef} className="portal-command-scene__floor" />
            <span className="portal-command-scene__vignette" />
          </div>
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
              Área do cliente
            </Link>
          </header>

          <section className="portal-command-deck" id="empresa">
            <div className="portal-command-deck__copy">
              <p className="portal-eyebrow">Sistemas que impulsionam o seu negócio</p>
              <h1>Tudo em um <span>só lugar.</span></h1>
              <p className="portal-home__intro">Soluções simples e completas para organizar, automatizar e fazer sua empresa evoluir.</p>
              <div className="portal-home__actions">
                <a href="#orcamento" className="portal-action portal-action--primary">Fazer um orçamento <ArrowRight className="size-4" /></a>
              </div>
            </div>

            <p className="portal-command-deck__side-note">Tecnologia<br />para resultados<br />reais</p>

            <div className="portal-command-deck__systems" aria-label="Sistemas publicados">
              <div className="portal-command-deck__systems-head">
                <button type="button" onClick={() => rotateCarousel(-1)} aria-label="Sistema anterior"><ChevronLeft className="size-4" /></button>
                <span>{heroProjects[carouselIndex]?.name}</span>
                <small>{carouselIndex + 1} / {heroProjects.length}</small>
                <button type="button" onClick={() => rotateCarousel(1)} aria-label="Próximo sistema"><ChevronRight className="size-4" /></button>
              </div>
              <div
                className="portal-command-deck__carousel"
                tabIndex={0}
                role="region"
                aria-label="Carrossel circular de sistemas"
                onWheel={handleCarouselWheel}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") { event.preventDefault(); rotateCarousel(-1); }
                  if (event.key === "ArrowRight") { event.preventDefault(); rotateCarousel(1); }
                }}
              >
                {heroProjects.map((project, projectIndex) => {
                  const Icon = project.icon;
                  const details = projectCatalogDetails[project.id];
                  const offset = getCircularOffset(projectIndex, carouselIndex, heroProjects.length);
                  const distance = Math.abs(offset);
                  const visible = distance <= 3;
                  const arcY = distance === 0 ? 0 : -Math.min(48, distance * 18);
                  const depth = distance * 92;
                  const cardStyle = {
                    opacity: visible ? Math.max(0.72, 1 - distance * 0.1) : 0,
                    pointerEvents: visible ? "auto" : "none",
                    zIndex: 20 - distance,
                    transform: `translateX(calc(-50% + ${offset * 14.2}vw)) translateY(${arcY}px) translateZ(${-depth}px) rotateY(${offset * -10}deg) scale(${1 - distance * 0.055})`,
                  } as CSSProperties;
                  return (
                    <a
                      key={project.id}
                      href={project.url || "#solucoes"}
                      target={project.url ? "_blank" : undefined}
                      rel={project.url ? "noopener noreferrer" : undefined}
                      className={`portal-command-card portal-command-card--${project.accent}`}
                      data-active={offset === 0}
                      data-visible={visible}
                      style={cardStyle}
                      tabIndex={visible ? 0 : -1}
                      aria-label={`${project.name}: ${project.description}`}
                    >
                      {details?.previewImage ? <span className="portal-command-card__backdrop" style={{ backgroundImage: `url("${details.previewImage}")` }} aria-hidden="true" /> : null}
                      <span className="portal-command-card__icon"><Icon className="size-5" /></span>
                      <span className="portal-command-card__name">{project.name}</span>
                      <span className="portal-command-card__description">{details?.audience || project.description}</span>
                      <span className="portal-command-card__open"><ArrowRight className="size-4" /></span>
                    </a>
                  );
                })}
              </div>
            </div>
            <a className="portal-command-deck__scroll" href="#solucoes"><span /> Clique para explorar</a>
          </section>
        </div>

        <section className="portal-solutions portal-room-section portal-room-section--systems" id="solucoes">
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
                  const details = projectCatalogDetails[project.id];
                  const solutionContent = (
                    <>
                      <div className="portal-solution__media">
                        {details?.previewImage ? <Image src={details.previewImage} alt={details.previewAlt || project.name} fill sizes="(max-width: 720px) 100vw, 220px" /> : <span className="portal-solution__media-empty"><Icon className="size-8" /><small>Prévia visual em preparação</small></span>}
                      </div>
                      <div className="portal-solution__details">
                        <div className="portal-solution__topline">
                          <span className={`portal-solution__icon portal-solution__icon--${project.accent}`}><Icon className="size-4" /></span>
                          <div className="min-w-0">
                            <span className="portal-solution__name">{project.name}</span>
                            <span className="portal-solution__category">{project.category}</span>
                          </div>
                          <span className={`portal-solution__status portal-solution__status--${project.availability}`}>
                            {project.availability === "online" ? "Online" : project.availability === "offline" ? "Offline" : "A verificar"}
                          </span>
                        </div>
                        <p className="portal-solution__description">{project.description}</p>
                        {details ? <>
                          <p className="portal-solution__audience"><strong>Indicado para:</strong> {details.audience}</p>
                          <ul className="portal-solution__highlights">{details.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>
                        </> : null}
                      </div>
                      <ArrowRight className="portal-solution__arrow size-4" />
                    </>
                  );
                  return project.url ? <a href={project.url} target="_blank" rel="noreferrer" className={`portal-solution portal-solution--${project.accent}`} key={project.id}>{solutionContent}</a> : <div className={`portal-solution portal-solution--${project.accent} portal-solution--disabled`} key={project.id}>{solutionContent}</div>;
                })}
              </div>
            ))}
          </div>
        </section>

        <section className="portal-services portal-room-section portal-room-section--services" id="servicos">
          <div className="portal-services__heading">
            <p className="portal-eyebrow">Como ajudamos</p>
            <h2>Do problema à solução em uma única direção.</h2>
          </div>
          <div className="portal-services__list">
            {serviceCards.map((service) => (
              <article key={service.number} aria-label={service.imageAlt} style={{ "--service-image": `url("${service.image}")` } as CSSProperties}>
                <span>{service.number}</span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="portal-plans portal-room-section portal-room-section--plans" id="planos">
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

        <section className="portal-about portal-room-section portal-room-section--about" id="sobre">
          <div className="portal-about__video" aria-hidden="true">
            <video autoPlay muted loop playsInline preload="metadata">
              <source src="/portal-entry-room.mp4" type="video/mp4" />
            </video>
          </div>
          <div>
            <p className="portal-eyebrow">Quem somos</p>
            <h2>A Orquestra.cs resolve problemas através de tecnologia.</h2>
          </div>
          <p>Somos uma empresa de consultoria, infraestrutura comercial, corporativa e industrial. Unimos visão de negócio, equipamentos, software e automação para transformar complexidade em uma operação mais clara, segura e eficiente.</p>
        </section>

        <section className="portal-contact portal-room-section portal-room-section--contact" id="orcamento">
          <div className="portal-contact__copy">
            <p className="portal-eyebrow">Vamos tirar seu projeto do papel</p>
            <h2>Uma operação mais clara começa com uma boa conversa.</h2>
            <p>Conte o que sua empresa precisa. A Orquestra.cs ajuda você a encontrar o sistema, site ou automação certa para avançar.</p>
          </div>
          <div className="portal-contact__actions">
            <a href="https://wa.me/5515998478705?text=Ol%C3%A1%2C%20quero%20conversar%20sobre%20um%20or%C3%A7amento%20com%20a%20Orquestra.cs." target="_blank" rel="noreferrer" className="portal-action portal-action--primary"><MessageCircle className="size-4" /> Falar sobre meu projeto</a>
            <a href="mailto:orquestracs@gmail.com?subject=Suporte Orquestra.cs" className="portal-action portal-action--quiet"><Mail className="size-4" /> Enviar e-mail ao suporte</a>
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
