"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, LockKeyhole, Mail, Menu, MessageCircle, X } from "lucide-react";
import gsap from "gsap";
import { deployedProjects, projectCatalogDetails } from "@/lib/portal-data";
import { BrandLogo } from "@/components/brand-logo";
import { PortalWarpCanvas } from "@/components/portal-visual-effects";
import "./portal-landing.css";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";

type GatewayPhase = "arrival" | "entering" | "inside";
type EntranceMode = "video" | "procedural";

const PORTAL_ASSET_VERSION = "20261104";

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
    image: "/orquestra-consultoria-v1.webp",
    imageAlt: "Ilustração conceitual de consultores analisando o planejamento de uma operação",
  },
  {
    number: "02",
    title: "Infraestrutura",
    description: "Equipamentos, rede e ambiente preparados para a sua empresa trabalhar com segurança.",
    image: "/orquestra-infraestrutura-v2.webp",
    imageAlt: "Ilustração conceitual de infraestrutura industrial e operação de produção",
  },
  {
    number: "03",
    title: "Software e automação",
    description: "Sistemas, sites e fluxos digitais personalizados para reduzir esforço e dar clareza.",
    image: "/orquestra-software-automacao-v2.webp",
    imageAlt: "Ilustração conceitual de interface de gestão e automação empresarial",
  },
];

// Partículas do hero: posições fixas (sem Math.random) para não divergir entre servidor e cliente.
const heroParticles = Array.from({ length: 10 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: i % 3 === 0 ? 2 : 1,
  duration: 16 + ((i * 7) % 10),
  delay: -((i * 13) % 23),
  drift: ((i % 5) - 2) * 10,
}));

// Cabos de energia no chão da sala (coordenadas da imagem 1672x941). Saem das laterais,
// contornam a borda do pedestal e chegam à frente, embaixo do anel.
type Point = readonly [number, number];
type Curve = readonly [number, number, number, number, number, number];
type FloorCable = { start: Point; curves: readonly Curve[]; pulse: number | null };

const STAGE_W = 1672;
const STAGE_H = 941;
// Um pulso por minuto, alternando os lados: energia discreta, não um efeito constante.
const CABLE_CYCLE = 120;
const CABLE_TRAVEL_SECONDS = 2.6;
const RIM_FRONT: Curve = [520, 614, 700, 620, 834, 620];
const RIM_FRONT_RIGHT: Curve = [1148, 614, 968, 620, 834, 620];

const floorCables: readonly FloorCable[] = [
  { start: [0, 548], curves: [[150, 545, 280, 552, 362, 574], RIM_FRONT], pulse: 4 },
  { start: [1672, 548], curves: [[1522, 545, 1392, 552, 1310, 574], RIM_FRONT_RIGHT], pulse: 64 },
  { start: [0, 690], curves: [[150, 660, 270, 615, 372, 590], RIM_FRONT], pulse: null },
  { start: [1672, 690], curves: [[1522, 660, 1402, 615, 1300, 590], RIM_FRONT_RIGHT], pulse: null },
  { start: [60, 941], curves: [[170, 820, 290, 680, 388, 600]], pulse: null },
  { start: [1612, 941], curves: [[1502, 820, 1382, 680, 1284, 600]], pulse: null },
];

function cablePath(cable: FloorCable) {
  return `M${cable.start[0]} ${cable.start[1]} ${cable.curves.map((c) => `C${c.join(" ")}`).join(" ")}`;
}

function cablePoints(cable: FloorCable, perCurve = 8): Point[] {
  const points: Point[] = [cable.start];
  let [x0, y0] = cable.start;
  for (const [x1, y1, x2, y2, x3, y3] of cable.curves) {
    for (let i = 1; i <= perCurve; i++) {
      const t = i / perCurve;
      const u = 1 - t;
      points.push([
        u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      ]);
    }
    [x0, y0] = [x3, y3];
  }
  return points;
}

// Keyframes dos pulsos: só translate (em unidades do palco, cqw/cqh) e opacity, que rodam no compositor.
const cablePulseKeyframes = floorCables
  .map((cable, index) => {
    if (cable.pulse === null) return "";
    const points = cablePoints(cable);
    const travel = (CABLE_TRAVEL_SECONDS / CABLE_CYCLE) * 100; // % do ciclo gasto percorrendo o cabo
    const frames = points.map(([x, y], i) => {
      const at = ((i / (points.length - 1)) * travel).toFixed(2);
      const opacity = i === 0 ? 0 : 1;
      return `${at}%{translate:${((x / STAGE_W) * 100).toFixed(3)}cqw ${((y / STAGE_H) * 100).toFixed(3)}cqh;opacity:${opacity}}`;
    });
    const [ex, ey] = points[points.length - 1];
    const end = `${((ex / STAGE_W) * 100).toFixed(3)}cqw ${((ey / STAGE_H) * 100).toFixed(3)}cqh`;
    return `@keyframes lp-pulse-${index}{${frames.join("")}${(travel + 0.4).toFixed(2)}%,100%{translate:${end};opacity:0}}`;
  })
  .join("");

const DECODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&/<>*+";

const plans = [
  { name: "Essencial", title: "Uma solução para organizar a rotina.", description: "Ideal para começar com um sistema objetivo e suporte próximo.", featured: false },
  { name: "Profissional", title: "Mais controle para uma operação em crescimento.", description: "Módulos, usuários e acompanhamento para ganhar escala.", featured: true },
  { name: "Sob medida", title: "A tecnologia desenhada para o seu cenário.", description: "Consultoria, infraestrutura e desenvolvimento integrado.", featured: false },
];

export function PortalLanding() {
  const [phase, setPhase] = useState<GatewayPhase>("arrival");
  const [entranceMode, setEntranceMode] = useState<EntranceMode>("video");
  const [entranceVideoReady, setEntranceVideoReady] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(initialHeroProjectIndex);
  const [menuOpen, setMenuOpen] = useState(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);
  const carouselWheelTimerRef = useRef<number | null>(null);
  const gatewayRef = useRef<HTMLDivElement>(null);
  const entranceVideoRef = useRef<HTMLVideoElement>(null);
  const veilRef = useRef<HTMLSpanElement>(null);
  const transitionLightRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const siteRef = useRef<HTMLDivElement>(null);
  const commandSceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = entranceVideoRef.current;
    if (!video) return;

    const markVideoReady = () => {
      setEntranceVideoReady(true);
    };

    const confirmPortalFrame = () => {
      markVideoReady();
    };
    video.addEventListener("loadeddata", confirmPortalFrame);
    video.addEventListener("canplay", confirmPortalFrame);
    if (video.readyState >= 2) markVideoReady();

    return () => {
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

  // Só gestos horizontais (trackpad) giram o carrossel; a rolagem vertical da página nunca é capturada.
  const handleCarouselWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 12 || carouselWheelTimerRef.current !== null) return;
    rotateCarousel(event.deltaX > 0 ? 1 : -1);
    carouselWheelTimerRef.current = window.setTimeout(() => {
      carouselWheelTimerRef.current = null;
    }, 420);
  }, [rotateCarousel]);

  const handleSwipeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
    swipedRef.current = false;
  }, []);

  const handleSwipeEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(event.clientY - start.y)) {
      swipedRef.current = true;
      rotateCarousel(dx < 0 ? 1 : -1);
    }
  }, [rotateCarousel]);

  // Inclinação 3D do card ativo acompanhando o ponteiro (só transform, sem re-render).
  const handleCardTilt = useCallback((event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== "mouse") return;
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty("--tilt-x", `${(-y * 10).toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${(x * 12).toFixed(2)}deg`);
    card.style.setProperty("--glare-x", `${((x + 0.5) * 100).toFixed(1)}%`);
    card.style.setProperty("--glare-y", `${((y + 0.5) * 100).toFixed(1)}%`);
  }, []);

  // Superfície 3D dos cards das seções: inclina e move o reflexo seguindo o mouse.
  const handleSurfaceTilt = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    card.style.setProperty("--rx", `${((0.5 - y) * 9).toFixed(2)}deg`);
    card.style.setProperty("--ry", `${((x - 0.5) * 11).toFixed(2)}deg`);
    card.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    card.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  }, []);

  const resetSurfaceTilt = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const card = event.currentTarget;
    ["--rx", "--ry", "--mx", "--my"].forEach((name) => card.style.removeProperty(name));
  }, []);

  const resetCardTilt = useCallback((event: ReactPointerEvent<HTMLAnchorElement>) => {
    const card = event.currentTarget;
    card.style.removeProperty("--tilt-x");
    card.style.removeProperty("--tilt-y");
  }, []);

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
    if (phase !== "inside" || !scene || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      gsap.fromTo(scene, { autoAlpha: 0, scale: 1.012 }, { autoAlpha: 1, scale: 1, duration: 0.9, ease: "power2.out" });
    }, siteRef);

    return () => {
      context.revert();
    };
  }, [phase]);

  // Revelação suave das seções ao entrar na tela. Só ativa com JavaScript e sem prefers-reduced-motion,
  // para que o conteúdo nunca fique oculto se a animação não puder rodar.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const sections = document.querySelectorAll<HTMLElement>(".lp-reveal");
    if (!sections.length) return;

    sections.forEach((section) => section.setAttribute("data-reveal", "pending"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).setAttribute("data-reveal", "in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -4% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      sections.forEach((section) => section.removeAttribute("data-reveal"));
    };
  }, []);

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


  // Títulos se "decodificam" (caracteres aleatórios até o texto final) ao entrar na tela, uma vez só.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const headings = Array.from(document.querySelectorAll<HTMLElement>(".lp [data-decode]"));
    const frames = new Map<HTMLElement, number>();

    const decode = (element: HTMLElement) => {
      const finalText = element.dataset.text || element.textContent || "";
      element.dataset.text = finalText;
      element.setAttribute("aria-label", finalText);
      element.style.minHeight = `${element.offsetHeight}px`;
      const duration = 900;
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const revealed = Math.floor(progress * finalText.length);
        let output = finalText.slice(0, revealed);
        for (let i = revealed; i < finalText.length; i++) {
          const char = finalText[i];
          output += char === " " || char === "." ? char : DECODE_CHARS[(Math.random() * DECODE_CHARS.length) | 0];
        }
        element.textContent = output;
        if (progress < 1) {
          frames.set(element, requestAnimationFrame(step));
        } else {
          element.textContent = finalText;
          element.style.minHeight = "";
          element.removeAttribute("aria-label");
          frames.delete(element);
        }
      };
      frames.set(element, requestAnimationFrame(step));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          decode(entry.target as HTMLElement);
        });
      },
      { threshold: 0.6 },
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => {
      observer.disconnect();
      frames.forEach((frame, element) => {
        cancelAnimationFrame(frame);
        if (element.dataset.text) element.textContent = element.dataset.text;
        element.style.minHeight = "";
        element.removeAttribute("aria-label");
      });
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const navLinks = [
    { href: "#solucoes", label: "Sistemas" },
    { href: "#servicos", label: "Consultoria" },
    { href: "#planos", label: "Planos" },
    { href: "#sobre", label: "Quem somos" },
    { href: "#orcamento", label: "Contato" },
  ];

  return (
    <main className={`portal-shell portal-shell--${phase} portal-shell--${entranceMode} ${entranceVideoReady ? "portal-shell--video-ready" : ""}`}>
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
            src={`/portal-entry-room-web.mp4?v=${PORTAL_ASSET_VERSION}`}
            playsInline
            muted
            preload="auto"
            poster="/portal-entry-poster.webp"
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
        <span ref={contentRef} className="portal-gateway__content lp-gate">
          <span className="lp-gate__hint">Clique ou toque para entrar</span>
        </span>
        <button type="button" className="portal-gateway__skip lp-gate__skip" onClick={(event) => { event.stopPropagation(); skipEntrance(); }}>
          Pular entrada
        </button>
      </div>

      <div ref={siteRef} className="lp" tabIndex={-1} inert={phase !== "inside"} aria-hidden={phase !== "inside"}>
        <div className="lp-backdrop" aria-hidden="true">
          <span className="lp-backdrop__glow" />
          <span className="lp-backdrop__grid" />
        </div>
        <header className="lp-header" data-open={menuOpen}>
          <div className="lp-header__bar">
            <span className="lp-progress" aria-hidden="true" />
            <Link href="/" className="lp-header__brand" aria-label="Orquestra.cs - início">
              <BrandLogo variant="essential" size={32} showWordmark tone="light" />
            </Link>
            <nav className="lp-header__nav" aria-label="Navegação principal">
              {navLinks.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
            </nav>
            <div className="lp-header__actions">
              <Link href="/login" className="lp-btn lp-btn--ghost lp-btn--sm">
                <LockKeyhole className="size-3.5" aria-hidden="true" /> Área do cliente
              </Link>
              <button
                type="button"
                className="lp-header__menu"
                aria-expanded={menuOpen}
                aria-controls="lp-mobile-nav"
                aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>
          <nav id="lp-mobile-nav" className="lp-header__mobile" aria-label="Navegação" hidden={!menuOpen}>
            {navLinks.map((link) => <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</a>)}
            <Link href="/login" className="lp-header__mobile-login">Área do cliente</Link>
          </nav>
        </header>

        <section className="lp-hero" id="empresa">
          <div ref={commandSceneRef} className="lp-hero__scene" aria-hidden="true">
            {/* Palco com a mesma proporção da imagem: cabos e anel ficam alinhados à foto em qualquer tela. */}
            <div className="lp-stage">
              <Image
                src={`/orquestra-command-room-reference-v1.webp?v=${PORTAL_ASSET_VERSION}`}
                alt=""
                fill
                priority
                unoptimized
                sizes="100vw"
                className="lp-hero__image"
              />
              <span className="lp-ring" />
            </div>
            {/* Segunda camada com a mesma geometria, acima do escurecimento: cabos e energia ficam visíveis. */}
            <div className="lp-stage lp-stage--fx">
              <svg className="lp-cables" viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} preserveAspectRatio="none" focusable="false">
                {floorCables.map((cable, index) => (
                  <g key={index}>
                    <path d={cablePath(cable)} className="lp-cable" />
                    <path d={cablePath(cable)} className="lp-cable__core" data-live={cable.pulse !== null} />
                  </g>
                ))}
              </svg>
              <style>{cablePulseKeyframes}</style>
              {floorCables.map((cable, index) =>
                cable.pulse === null
                  ? null
                  : [0, 0.04, 0.08].map((lag, tail) => (
                      <span
                        key={`${index}-${tail}`}
                        className="lp-pulse"
                        data-tail={tail}
                        style={{ animationName: `lp-pulse-${index}`, animationDelay: `${(cable.pulse ?? 0) + lag}s`, animationDuration: `${CABLE_CYCLE}s` }}
                      />
                    )),
              )}
              <span className="lp-flash lp-flash--rim" />
              <span className="lp-flash lp-flash--base" />
            </div>
            <span className="lp-particles">
              {heroParticles.map((particle, index) => (
                <span
                  key={index}
                  style={{
                    left: `${particle.left}%`,
                    width: particle.size,
                    height: particle.size,
                    animationDuration: `${particle.duration}s`,
                    animationDelay: `${particle.delay}s`,
                    "--drift": `${particle.drift}px`,
                  } as CSSProperties}
                />
              ))}
            </span>
          </div>

          <div className="lp-container lp-hero__content">
            <div className="lp-hero__copy">
              <p className="lp-eyebrow">Sistemas que impulsionam o seu negócio</p>
              <h1 className="lp-hero__title">Tudo em um <span>só lugar.</span></h1>
              <p className="lp-hero__lead">Soluções simples e completas para organizar, automatizar e fazer sua empresa evoluir.</p>
              <div className="lp-hero__actions">
                <a href="#orcamento" className="lp-btn lp-btn--primary">Fazer um orçamento <ArrowRight className="size-4" aria-hidden="true" /></a>
                <a href="#solucoes" className="lp-btn lp-btn--ghost">Ver sistemas</a>
              </div>
            </div>
          </div>

          <div className="lp-showcase" aria-label="Sistemas publicados">
            <div className="lp-showcase__head">
              <button type="button" className="lp-round-btn" onClick={() => rotateCarousel(-1)} aria-label="Sistema anterior"><ChevronLeft className="size-4" /></button>
              <p className="lp-showcase__label" aria-live="polite">
                <span>{heroProjects[carouselIndex]?.name}</span>
                <small>{String(carouselIndex + 1).padStart(2, "0")} / {String(heroProjects.length).padStart(2, "0")}</small>
              </p>
              <button type="button" className="lp-round-btn" onClick={() => rotateCarousel(1)} aria-label="Próximo sistema"><ChevronRight className="size-4" /></button>
            </div>
            <div
              className="lp-carousel"
              tabIndex={0}
              role="region"
              aria-roledescription="carrossel"
              aria-label="Carrossel de sistemas. Use as setas do teclado para navegar."
              onWheel={handleCarouselWheel}
              onPointerDown={handleSwipeStart}
              onPointerUp={handleSwipeEnd}
              onPointerCancel={() => { swipeStartRef.current = null; }}
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
                const active = offset === 0;
                const visible = distance <= 3;
                return (
                  <a
                    key={project.id}
                    href={project.url || "#solucoes"}
                    target={project.url ? "_blank" : undefined}
                    rel={project.url ? "noopener noreferrer" : undefined}
                    className={`lp-card3d lp-accent--${project.accent}`}
                    data-active={active}
                    data-distance={distance}
                    style={{ "--o": offset, "--d": distance, zIndex: 20 - distance } as CSSProperties}
                    tabIndex={visible ? 0 : -1}
                    aria-hidden={!visible}
                    aria-label={`${project.name}: ${details?.audience || project.description}`}
                    onClick={(event) => {
                      // Primeiro toque/clique em um card lateral só o traz para o centro.
                      if (swipedRef.current || !active) {
                        event.preventDefault();
                        swipedRef.current = false;
                        if (!active) setCarouselIndex(projectIndex);
                      }
                    }}
                    onPointerMove={active ? handleCardTilt : undefined}
                    onPointerLeave={active ? resetCardTilt : undefined}
                    draggable={false}
                  >
                    <span className="lp-card3d__inner">
                      {details?.previewImage ? <span className="lp-card3d__media" style={{ backgroundImage: `url("${details.previewImage}")` }} aria-hidden="true" /> : null}
                      <span className="lp-card3d__glare" aria-hidden="true" />
                      <span className="lp-card3d__icon"><Icon className="size-5" aria-hidden="true" /></span>
                      <span className="lp-card3d__body">
                        <span className="lp-card3d__name">{project.name}</span>
                        <span className="lp-card3d__desc">{details?.audience || project.description}</span>
                        <span className="lp-card3d__cta">{project.url ? "Acessar" : "Conhecer"} <ArrowUpRight className="size-3.5" aria-hidden="true" /></span>
                      </span>
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        <section className="lp-section lp-reveal" id="solucoes">
          <div className="lp-container">
            <div className="lp-section__head">
              <p className="lp-eyebrow">Sistemas publicados</p>
              <h2 data-decode>Produtos reais da Orquestra.cs.</h2>
              <p>Cada sistema nasce para resolver uma rotina específica e pode evoluir com a operação.</p>
            </div>
            {solutionGroups.map((group) => (
              <div className="lp-group" key={group.title}>
                <div className="lp-group__head">
                  <h3>{group.title}</h3>
                  <p>{group.description}</p>
                </div>
                <div className="lp-grid lp-grid--systems">
                  {group.ids.map((id) => {
                    const project = deployedProjects.find((item) => item.id === id);
                    if (!project) return null;
                    const Icon = project.icon;
                    const details = projectCatalogDetails[project.id];
                    const statusLabel = project.availability === "online" ? "Online" : project.availability === "offline" ? "Offline" : "Em breve";
                    const content = (
                      <>
                        <span className="lp-system__media">
                          {details?.previewImage
                            ? <Image src={details.previewImage} alt={details.previewAlt || project.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 300px" />
                            : <span className="lp-system__media-empty"><Icon className="size-8" aria-hidden="true" /></span>}
                          <span className={`lp-status lp-status--${project.availability}`}>{statusLabel}</span>
                        </span>
                        <span className="lp-system__body">
                          <span className="lp-system__title">
                            <span className="lp-system__icon"><Icon className="size-4" aria-hidden="true" /></span>
                            <span>
                              <strong>{project.name}</strong>
                              <small>{project.category}</small>
                            </span>
                          </span>
                          <span className="lp-system__desc">{project.description}</span>
                          {details ? (
                            <span className="lp-system__tags">
                              {details.highlights.slice(0, 3).map((highlight) => <span key={highlight}>{highlight}</span>)}
                            </span>
                          ) : null}
                          <span className="lp-system__cta">{project.url ? <>Acessar sistema <ArrowUpRight className="size-4" aria-hidden="true" /></> : "Disponível em breve"}</span>
                        </span>
                      </>
                    );
                    return project.url
                      ? <a key={project.id} href={project.url} target="_blank" rel="noopener noreferrer" className={`lp-system lp-accent--${project.accent}`} onPointerMove={handleSurfaceTilt} onPointerLeave={resetSurfaceTilt}>{content}</a>
                      : <div key={project.id} className={`lp-system lp-system--disabled lp-accent--${project.accent}`} onPointerMove={handleSurfaceTilt} onPointerLeave={resetSurfaceTilt}>{content}</div>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-section lp-section--alt lp-reveal" id="servicos">
          <div className="lp-container">
            <div className="lp-section__head">
              <p className="lp-eyebrow">Como ajudamos</p>
              <h2 data-decode>Do problema à solução em uma única direção.</h2>
            </div>
            <div className="lp-grid lp-grid--3">
              {serviceCards.map((service) => (
                <article key={service.number} className="lp-service" onPointerMove={handleSurfaceTilt} onPointerLeave={resetSurfaceTilt}>
                  <span className="lp-service__media">
                    <Image src={service.image} alt={service.imageAlt} fill sizes="(max-width: 900px) 100vw, 380px" />
                  </span>
                  <span className="lp-service__body">
                    <span className="lp-service__number">{service.number}</span>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section lp-reveal" id="planos">
          <div className="lp-container">
            <div className="lp-section__head">
              <p className="lp-eyebrow">Planos e projetos</p>
              <h2 data-decode>Comece pelo que sua operação precisa hoje.</h2>
            </div>
            <div className="lp-grid lp-grid--3">
              {plans.map((plan) => (
                <article key={plan.name} className="lp-plan" data-featured={plan.featured || undefined} onPointerMove={handleSurfaceTilt} onPointerLeave={resetSurfaceTilt}>
                  <span className="lp-plan__name">{plan.name}</span>
                  <h3>{plan.title}</h3>
                  <p>{plan.description}</p>
                  <a href="#orcamento" className={`lp-btn ${plan.featured ? "lp-btn--primary" : "lp-btn--ghost"} lp-btn--block`}>Solicitar proposta</a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section lp-section--alt lp-reveal" id="sobre">
          <div className="lp-container lp-about">
            <div className="lp-about__media">
              <Image src="/orquestra-command-room-v5.webp" alt="Sala de comando conceitual da Orquestra.cs" fill sizes="(max-width: 900px) 100vw, 560px" />
            </div>
            <div className="lp-about__copy">
              <p className="lp-eyebrow">Quem somos</p>
              <h2 data-decode>A Orquestra.cs resolve problemas através de tecnologia.</h2>
              <p>Somos uma empresa de consultoria, infraestrutura comercial, corporativa e industrial. Unimos visão de negócio, equipamentos, software e automação para transformar complexidade em uma operação mais clara, segura e eficiente.</p>
            </div>
          </div>
        </section>

        <section className="lp-section lp-reveal" id="orcamento">
          <div className="lp-container">
            <div className="lp-cta">
              <div>
                <p className="lp-eyebrow">Vamos tirar seu projeto do papel</p>
                <h2 data-decode>Uma operação mais clara começa com uma boa conversa.</h2>
                <p>Conte o que sua empresa precisa. A Orquestra.cs ajuda você a encontrar o sistema, site ou automação certa para avançar.</p>
              </div>
              <div className="lp-cta__actions">
                <Link href="/contato" className="lp-agent">
                  <Image src="/cracha-thumb.webp" alt="" width={64} height={99} className="lp-agent__badge" />
                  <span className="lp-agent__text">
                    <small>Fale com um de nossos atendentes</small>
                    <strong>Alecsander Lima</strong>
                    <span>Fundador · Tecnologia &amp; Sistemas</span>
                  </span>
                  <ArrowUpRight className="lp-agent__arrow size-4" aria-hidden="true" />
                </Link>
                <a href="https://wa.me/5515998478705?text=Ol%C3%A1%2C%20quero%20conversar%20sobre%20um%20or%C3%A7amento%20com%20a%20Orquestra.cs." target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn--primary"><MessageCircle className="size-4" aria-hidden="true" /> Falar sobre meu projeto</a>
                <a href="mailto:orquestracs@gmail.com?subject=Suporte Orquestra.cs" className="lp-btn lp-btn--ghost"><Mail className="size-4" aria-hidden="true" /> Enviar e-mail ao suporte</a>
              </div>
            </div>
          </div>
        </section>

        <footer className="lp-footer">
          <div className="lp-container lp-footer__inner">
            <BrandLogo variant="essential" size={24} showWordmark tone="light" />
            <span className="lp-footer__secure"><LockKeyhole className="size-3.5" aria-hidden="true" /> Acesso seguro por empresa</span>
            <Link href="/portal">Área do cliente</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
