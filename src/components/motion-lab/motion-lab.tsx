"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, type CSSProperties } from "react";
import {
  ArrowRight,
  BrainCircuit,
  ChartNoAxesCombined,
  ChevronDown,
  Network,
  Sparkles,
  Workflow,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BrandLogo } from "@/components/brand-logo";
import { motionLabConfig } from "./animation-config";
import { CharacterMedia } from "./character-media";
import styles from "./motion-lab.module.css";

gsap.registerPlugin(ScrollTrigger);

const signalCards = [
  { label: "Inteligência", detail: "Contexto em tempo real", icon: BrainCircuit },
  { label: "Automação", detail: "Fluxos que se conectam", icon: Workflow },
  { label: "Decisão", detail: "Indicadores que orientam", icon: ChartNoAxesCombined },
];

const particles = Array.from({ length: 28 }, (_, index) => ({
  left: `${8 + ((index * 37) % 84)}%`,
  top: `${7 + ((index * 53) % 86)}%`,
  delay: `${(index % 9) * -0.7}s`,
  duration: `${7 + (index % 6) * 1.4}s`,
}));

export function MotionLab() {
  const headerRef = useRef<HTMLElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const story = storyRef.current;
    const header = headerRef.current;
    const stage = stageRef.current;
    const character = characterRef.current;
    const glow = glowRef.current;
    if (!story || !header || !stage || !character || !glow) return;

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const compact = window.matchMedia("(max-width: 760px)").matches;
        gsap.from(header, {
          autoAlpha: 0,
          y: -16,
          duration: 0.8,
          ease: "power3.out",
        });
        gsap.from("[data-motion='hero-copy'] > *", {
          autoAlpha: 0,
          y: 28,
          duration: 0.9,
          stagger: 0.1,
          ease: "power3.out",
        });
        gsap.from(character, {
          autoAlpha: 0,
          xPercent: 8,
          scale: 0.96,
          duration: 1.2,
          ease: "power3.out",
        });

        if (!motionLabConfig.scrollStorytelling) return;

        const timeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: story,
            start: "top top",
            end: `+=${Math.round(window.innerHeight * motionLabConfig.scrollDistance)}`,
            scrub: 1.05,
            pin: stage,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => story.style.setProperty("--story-progress", self.progress.toString()),
          },
        });

        timeline
          .to("[data-motion='scroll-cue']", { autoAlpha: 0, y: 12, duration: 8 }, 0)
          .to("[data-motion='hero-copy']", { autoAlpha: 0, y: -56, duration: 18 }, 6)
          .to(
            character,
            { xPercent: compact ? -8 : -38, yPercent: compact ? 5 : -4, scale: compact ? 1.02 : 1.08, duration: 30 },
            10,
          )
          .to(glow, { xPercent: -26, scale: 1.18, opacity: 0.92, duration: 30 }, 10)
          .fromTo(
            "[data-motion='interface']",
            { autoAlpha: 0, xPercent: 18, scale: 0.94 },
            { autoAlpha: 1, xPercent: 0, scale: 1, duration: 20 },
            27,
          )
          .fromTo(
            "[data-motion='connector']",
            { scaleX: 0, autoAlpha: 0 },
            { scaleX: 1, autoAlpha: 1, duration: 16, stagger: 2 },
            34,
          )
          .fromTo(
            "[data-motion='signal-card']",
            { autoAlpha: 0, y: 36, scale: 0.92 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 17, stagger: 4 },
            39,
          )
          .to("[data-motion='interface']", { xPercent: compact ? 0 : -9, yPercent: -3, duration: 22 }, 57)
          .to(
            character,
            { xPercent: compact ? -4 : -15, yPercent: compact ? 8 : 3, scale: 0.98, duration: 22 },
            61,
          )
          .to("[data-motion='signal-card']", { autoAlpha: 0, y: -24, duration: 14, stagger: 1.4 }, 75)
          .to("[data-motion='interface']", { autoAlpha: 0.18, scale: 1.04, duration: 16 }, 77)
          .fromTo(
            "[data-motion='final-copy']",
            { autoAlpha: 0, y: 48 },
            { autoAlpha: 1, y: 0, duration: 20 },
            80,
          );

        if (motionLabConfig.parallax) {
          gsap.utils.toArray<HTMLElement>("[data-depth]").forEach((layer) => {
            const depth = Number(layer.dataset.depth ?? 0.5);
            timeline.to(
              layer,
              { yPercent: -motionLabConfig.parallaxTravel * depth, duration: 100 },
              0,
            );
          });
        }
      });

      if (motionLabConfig.mouseParallax && window.matchMedia("(pointer: fine)").matches) {
        const moveCharacterX = gsap.quickTo(character, "x", { duration: 0.8, ease: "power3.out" });
        const moveCharacterY = gsap.quickTo(character, "y", { duration: 0.8, ease: "power3.out" });
        const moveGlowX = gsap.quickTo(glow, "x", { duration: 1.2, ease: "power3.out" });
        const moveGlowY = gsap.quickTo(glow, "y", { duration: 1.2, ease: "power3.out" });

        const handlePointerMove = (event: PointerEvent) => {
          const x = event.clientX / window.innerWidth - 0.5;
          const y = event.clientY / window.innerHeight - 0.5;
          moveCharacterX(x * motionLabConfig.mouseTravel);
          moveCharacterY(y * motionLabConfig.mouseTravel * 0.7);
          moveGlowX(x * motionLabConfig.mouseTravel * -1.4);
          moveGlowY(y * motionLabConfig.mouseTravel * -1.1);
        };

        window.addEventListener("pointermove", handlePointerMove, { passive: true });
        return () => {
          window.removeEventListener("pointermove", handlePointerMove);
          media.revert();
        };
      }

      return () => media.revert();
    }, story);

    return () => context.revert();
  }, []);

  return (
    <main
      className={styles.lab}
      style={{ "--floating-distance": `${motionLabConfig.floatingDistance}px` } as CSSProperties}
    >
      <header ref={headerRef} className={styles.header} data-motion="brand">
        <Link href="/" aria-label="Voltar ao Portal Orquestra.cs">
          <BrandLogo variant="essential" size={38} showWordmark tone="light" />
        </Link>
        <div className={styles.headerMeta}>
          <span className={styles.liveDot} />
          Experimento de movimento
        </div>
      </header>

      <section ref={storyRef} className={styles.story} aria-label="Experiência visual Orquestra.cs">
        <div ref={stageRef} className={styles.stage}>
          <div className={styles.backgroundGrid} data-depth="0.18" />
          <div className={styles.horizonLight} data-depth="0.3" />
          <div ref={glowRef} className={styles.characterGlow} data-depth="0.4" />
          <div className={styles.architecture} data-depth="0.24" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          {motionLabConfig.particles && (
            <div className={styles.particles} data-depth="0.62" aria-hidden="true">
              {particles.map((particle, index) => (
                <span
                  key={index}
                  style={{
                    left: particle.left,
                    top: particle.top,
                    animationDelay: particle.delay,
                    animationDuration: particle.duration,
                  }}
                />
              ))}
            </div>
          )}

          <div className={styles.progressRail} aria-hidden="true">
            <span />
          </div>

          <div className={styles.heroCopy} data-motion="hero-copy">
            <p className={styles.eyebrow}>Tecnologia em estado vivo</p>
            <h1>
              Sua operação,
              <span>orquestrada.</span>
            </h1>
            <p className={styles.intro}>
              Informação, automação e inteligência se movem como uma única estrutura ao redor do seu negócio.
            </p>
            <a href="#proxima-cena" className={styles.primaryAction}>
              Iniciar experiência <ArrowRight className="size-4" />
            </a>
          </div>

          <div className={styles.visualScene}>
            <div
              ref={characterRef}
              className={`${styles.character} ${motionLabConfig.characterFloating ? styles.characterFloating : ""}`}
              data-motion="character"
            >
              <div className={styles.characterHalo} aria-hidden="true" />
              <CharacterMedia
                type="image"
                src="/orquestra-motion-conductor.png"
                alt="Figura abstrata conduzindo uma operação digital"
                priority
              />
              <div className={styles.characterShadow} aria-hidden="true" />
            </div>

            <div className={styles.interfacePanel} data-motion="interface">
              <div className={styles.interfaceHeader}>
                <span>Orquestra Intelligence</span>
                <Sparkles className="size-4" />
              </div>
              <div className={styles.metricLine}>
                <span>Operação sincronizada</span>
                <strong>96%</strong>
              </div>
              <div className={styles.chart} aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className={styles.interfaceStatus}>
                <span><i /> Processos conectados</span>
                <span>Agora</span>
              </div>
            </div>

            <div className={styles.connectorA} data-motion="connector" aria-hidden="true" />
            <div className={styles.connectorB} data-motion="connector" aria-hidden="true" />

            <div className={styles.signalCards}>
              {signalCards.map(({ label, detail, icon: Icon }, index) => (
                <article key={label} className={styles.signalCard} data-motion="signal-card" data-index={index}>
                  <Icon className="size-5" />
                  <div>
                    <h2>{label}</h2>
                    <p>{detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.finalCopy} data-motion="final-copy">
            <Network className={styles.finalIcon} />
            <p>Quando tudo conversa, sua empresa avança.</p>
            <h2>Uma direção para cada decisão.</h2>
            <Link href="/#orcamento" className={styles.primaryAction}>
              Conversar com a Orquestra.cs <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className={styles.scrollCue} data-motion="scroll-cue">
            <span>Continue</span>
            <ChevronDown className="size-4" />
          </div>
        </div>
      </section>

      <section id="proxima-cena" className={styles.epilogue}>
        <p className={styles.eyebrow}>Do conceito à operação</p>
        <h2>O movimento chama atenção. A solução sustenta o negócio.</h2>
        <p>
          A mesma linguagem pode receber uma imagem transparente, um vídeo criado por IA ou uma cena 3D sem alterar a narrativa da página.
        </p>
        <Link href="/" className={styles.secondaryAction}>
          Voltar ao portal <ArrowRight className="size-4" />
        </Link>
      </section>
    </main>
  );
}
