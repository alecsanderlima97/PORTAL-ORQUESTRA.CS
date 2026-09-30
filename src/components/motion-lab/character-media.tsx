"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./motion-lab.module.css";

type CharacterMediaProps = {
  type: "image" | "video";
  src: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return reducedMotion;
}

export function CharacterMedia({
  type,
  src,
  fallbackSrc,
  alt,
  className = "",
  priority = false,
}: CharacterMediaProps) {
  const reducedMotion = useReducedMotion();
  const [videoFailed, setVideoFailed] = useState(false);
  const imageSource = type === "image" ? src : fallbackSrc;
  const showImage = type === "image" || reducedMotion || videoFailed;

  return (
    <div className={`${styles.characterMedia} ${className}`}>
      {showImage && imageSource ? (
        <Image
          src={imageSource}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 760px) 92vw, 48vw"
          className={styles.characterImage}
        />
      ) : (
        <video
          className={styles.characterVideo}
          src={src}
          poster={fallbackSrc}
          autoPlay
          muted
          playsInline
          loop
          preload="metadata"
          aria-label={alt}
          onError={() => setVideoFailed(true)}
        />
      )}
    </div>
  );
}

export type { CharacterMediaProps };
