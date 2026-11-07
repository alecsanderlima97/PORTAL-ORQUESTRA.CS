"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import Image from "next/image";
import { AtSign, Globe2, Mail, MessageCircle, RefreshCw, UserPlus } from "lucide-react";
import { createVCard, digitalContact } from "@/lib/contact-data";
import styles from "./contact-card.module.css";

// Cometas raros: cada um cruza a tela em ~2s e espera dezenas de segundos até voltar.
const comets = [
  { top: "14%", angle: 18, every: 31, delay: 4, length: 220 },
  { top: "62%", angle: -12, every: 47, delay: 19, length: 160 },
  { top: "34%", angle: 28, every: 71, delay: 38, length: 260 },
];

function Row({ href, icon, children, label }: { href: string; icon: ReactNode; children: ReactNode; label: string }) {
  const external = href.startsWith("http");
  return (
    <a className={styles.badgeRow} href={href} aria-label={label} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
      <span className={styles.badgeRowIcon} aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </a>
  );
}

export default function ContactCard() {
  const [saved, setSaved] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const swipeStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const whatsappHref = `https://wa.me/${digitalContact.phoneE164.replace("+", "")}?text=${encodeURIComponent(digitalContact.whatsappMessage)}`;

  function startSwipe(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary) return;
    swipeStart.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }

  function finishSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.5) setFlipped((value) => !value);
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
      {/* Espaço: estrelas em duas profundidades, órbita com satélite e cometas ocasionais. */}
      <div className={styles.space} aria-hidden="true">
        <span className={styles.starsFar} />
        <span className={styles.starsNear} />
        <span className={styles.nebula} />
        <span className={styles.orbit}><span className={styles.orbitSpin}><span className={styles.satellite} /></span></span>
        {comets.map((comet, index) => (
          <span key={index} className={styles.cometPath} style={{ top: comet.top, transform: `rotate(${comet.angle}deg)` }}>
            <span className={styles.comet} style={{ animationDuration: `${comet.every}s`, animationDelay: `${comet.delay}s`, width: comet.length }} />
          </span>
        ))}
      </div>

      <div className={styles.deck}>
        <div
          className={styles.badgeStage}
          data-flipped={flipped}
          aria-label="Crachá digital. Deslize para o lado para ver o verso."
          onPointerDown={startSwipe}
          onPointerUp={finishSwipe}
          onPointerCancel={() => { swipeStart.current = null; }}
        >
          {/* Frente: arte do crachá físico + textos e contatos reais por cima da faixa escura. */}
          <section className={`${styles.badge} ${styles.badgeFront}`} inert={flipped} aria-hidden={flipped} aria-labelledby="contact-title">
            <Image src="/cracha-frente-v2.webp" alt="" fill priority sizes="(max-width: 520px) 86vw, 420px" className={styles.badgeArt} draggable={false} />
            <svg className={styles.badgeEdge} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line x1="0" y1="43.5" x2="100" y2="65" className={styles.badgeEdgeGlow} />
              <line x1="0" y1="43.5" x2="100" y2="65" className={styles.badgeEdgeLine} />
            </svg>
            <div className={styles.badgePanel}>
              <h1 id="contact-title" className={styles.badgeName}>{digitalContact.name}</h1>
              <p className={styles.badgeRole}>Fundador</p>
              <p className={styles.badgeArea}>Tecnologia &amp; Sistemas</p>
              <span className={styles.badgeDivider} aria-hidden="true" />
              <div className={styles.badgeBody}>
                <nav className={styles.badgeRows} aria-label="Canais de contato">
                  <Row href={whatsappHref} icon={<MessageCircle />} label={`WhatsApp ${digitalContact.phoneDisplay}`}>{digitalContact.phoneDisplay}</Row>
                  <Row href={`mailto:${digitalContact.email}`} icon={<Mail />} label={`E-mail ${digitalContact.email}`}>{digitalContact.email}</Row>
                  <Row href={digitalContact.website} icon={<Globe2 />} label="Site portal.orquestracs.com">portal.orquestracs.com</Row>
                  <Row href={digitalContact.instagramUrl} icon={<AtSign />} label={`Instagram ${digitalContact.instagramHandle}`}>{digitalContact.instagramHandle}</Row>
                </nav>
                <div className={styles.badgeQr}>
                  {/* QR real para esta mesma página: dá para mostrar a tela para outra pessoa escanear. */}
                  <Image src="/contato-qr.svg" alt="QR Code do cartão digital" width={120} height={120} unoptimized />
                  <span>Escaneie e<br />conecte-se</span>
                </div>
              </div>
              <p className={styles.badgeFooter}>Sistemas | Automação | Consultoria<br />Tecnologia | Soluções</p>
            </div>
          </section>

          {/* Verso: arte da marca, igual à frente do crachá físico. */}
          <section className={`${styles.badge} ${styles.badgeBack}`} inert={!flipped} aria-hidden={!flipped} aria-label="Orquestra.cs, um portal para sua operação">
            <Image src="/cracha-verso-v2.webp" alt="" fill sizes="(max-width: 520px) 86vw, 420px" className={styles.badgeArt} draggable={false} />
          </section>
        </div>
      </div>

      <div className={styles.badgeActions}>
        <button type="button" className={`${styles.badgeButton} ${styles.badgeButtonPrimary}`} onClick={downloadContact}>
          <UserPlus aria-hidden="true" /> {saved ? "Contato salvo" : "Salvar contato"}
        </button>
        <a className={styles.badgeButton} href={whatsappHref} target="_blank" rel="noopener noreferrer">
          <MessageCircle aria-hidden="true" /> WhatsApp
        </a>
        <button type="button" className={styles.badgeButton} onClick={() => setFlipped((value) => !value)} aria-label="Virar o crachá">
          <RefreshCw aria-hidden="true" /> Virar
        </button>
      </div>
    </main>
  );
}
