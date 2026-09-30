"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  AtSign,
  ContactRound,
  Globe2,
  Mail,
  MessageCircle,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { createVCard, digitalContact } from "@/lib/contact-data";
import styles from "./contact-card.module.css";

const contactStars = Array.from({ length: 16 }, (_, index) => index);

function ActionIcon({ children }: { children: ReactNode }) {
  return <span className={styles.actionIcon}>{children}</span>;
}

export default function ContactCard() {
  const [saved, setSaved] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const swipeStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const whatsappHref = `https://wa.me/${digitalContact.phoneE164.replace("+", "")}?text=${encodeURIComponent(digitalContact.whatsappMessage)}`;

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || !cardRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const bounds = cardRef.current.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    cardRef.current.style.setProperty("--pointer-x", `${x * 100}%`);
    cardRef.current.style.setProperty("--pointer-y", `${y * 100}%`);
    cardRef.current.style.setProperty("--tilt-x", `${(0.5 - x) * 3.2}deg`);
    cardRef.current.style.setProperty("--tilt-y", `${(y - 0.5) * 3.2}deg`);
  }

  function resetPointer() {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty("--pointer-x", "50%");
    cardRef.current.style.setProperty("--pointer-y", "50%");
    cardRef.current.style.setProperty("--tilt-x", "0deg");
    cardRef.current.style.setProperty("--tilt-y", "0deg");
  }

  function startSwipe(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    swipeStart.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }

  function finishSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || start.id !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      resetPointer();
      setFlipped((value) => !value);
    }
  }

  function downloadContact() {
    const blob = new Blob([createVCard()], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "alecsander-lima-orquestra-cs.vcf";
    anchor.click();
    URL.revokeObjectURL(url);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  }

    return (
    <main className={styles.page}>
      <div className={styles.ambientRing} aria-hidden="true" />
      <div className={styles.deck}>
      <div
        className={styles.stage}
        data-flipped={flipped}
        aria-label="Cartão digital. Deslize para a esquerda ou direita para alternar entre a frente e o verso."
        onPointerDown={startSwipe}
        onPointerUp={finishSwipe}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          swipeStart.current = null;
        }}
      >
      <section
        ref={cardRef}
        className={`${styles.card} ${styles.front}`}
        inert={flipped}
        aria-hidden={flipped}
        aria-labelledby="contact-title"
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointer}
      >
        <div className={styles.holographicSweep} aria-hidden="true" />
        <div className={styles.crystalFoil} aria-hidden="true" />
        <div className={styles.starField} aria-hidden="true">
          {contactStars.map((star) => <span key={star} />)}
        </div>
        <div className={styles.portraitArea}>
          <Image src="/alecsander-contato.png" alt="Alecsander Lima" fill priority sizes="(max-width: 480px) 100vw, 448px" className={styles.portrait} draggable={false} />
          <header className={styles.portraitBrand}>
            <BrandLogo size={58} />
            <strong>orquestra<span>.cs</span></strong>
          </header>
        </div>

        <div className={styles.profile}>
          <h1 id="contact-title">{digitalContact.name}</h1>
          <p className={styles.role}><strong>Fundador</strong><br />Tecnologia &amp; Sistemas</p>
        </div>

        <div className={styles.actions} aria-label="Canais de contato">
          <a className={`${styles.action} ${styles.actionPrimary}`} href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <ActionIcon><MessageCircle aria-hidden="true" /></ActionIcon>
            <span><strong>Falar pelo WhatsApp</strong><small>{digitalContact.phoneDisplay}</small></span>
            <ArrowUpRight className={styles.actionArrow} aria-hidden="true" />
          </a>

          {digitalContact.instagramUrl ? (
            <a className={styles.action} href={digitalContact.instagramUrl} target="_blank" rel="noopener noreferrer">
              <ActionIcon><AtSign aria-hidden="true" /></ActionIcon>
              <span><strong>Instagram</strong><small>{digitalContact.instagramHandle}</small></span>
              <ArrowUpRight className={styles.actionArrow} aria-hidden="true" />
            </a>
          ) : (
            <div className={`${styles.action} ${styles.actionDisabled}`} aria-disabled="true">
              <ActionIcon><AtSign aria-hidden="true" /></ActionIcon>
              <span><strong>Instagram</strong><small>{digitalContact.instagramHandle} · URL pendente</small></span>
            </div>
          )}

          <a className={styles.action} href={digitalContact.website} target="_blank" rel="noopener noreferrer">
            <ActionIcon><Globe2 aria-hidden="true" /></ActionIcon>
            <span><strong>Conhecer a Orquestra.CS</strong><small>portal.orquestracs.com</small></span>
            <ArrowUpRight className={styles.actionArrow} aria-hidden="true" />
          </a>

          <a className={styles.action} href={`mailto:${digitalContact.email}`}>
            <ActionIcon><Mail aria-hidden="true" /></ActionIcon>
            <span><strong>Enviar um e-mail</strong><small>{digitalContact.email}</small></span>
            <ArrowUpRight className={styles.actionArrow} aria-hidden="true" />
          </a>

          <button className={styles.action} type="button" onClick={downloadContact}>
            <ActionIcon><ContactRound aria-hidden="true" /></ActionIcon>
            <span><strong>{saved ? "Contato salvo" : "Salvar contato"}</strong><small>Adicionar à agenda</small></span>
            <span className={styles.saveHint} aria-hidden="true">+</span>
          </button>
        </div>

        <footer className={styles.footer}>
          <p>Sistemas <span>•</span> Automação <span>•</span> Consultoria <span>•</span> Infraestrutura <span>•</span> Tecnologia</p>
          <span>Orquestra.CS</span>
        </footer>
      </section>
      <section className={`${styles.card} ${styles.back}`} inert={!flipped} aria-hidden={!flipped} aria-label="Marca Orquestra.cs">
        <div className={styles.crystalFoil} aria-hidden="true" />
        <div className={styles.portalAtmosphere} aria-hidden="true">
        <Image src="/orquestra-portal-altar-clean.png" alt="" fill sizes="(max-width: 500px) 100vw, 448px" className={styles.portalImage} />
          <div className={styles.crystalLight}><i /><i /><i /><i /></div>
          <div className={styles.lowFog} />
        </div>
        <div className={styles.backIdentity}>
          <div className={styles.foilMark}><BrandLogo size={210} /></div>
          <p className={styles.backWordmark}>orquestra<span>.cs</span></p>
        </div>
        <div className={styles.holographicSweep} aria-hidden="true" />
      </section>
      </div>
      </div>
    </main>
  );
}
