"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const WARP_DURATION_MS = 3300;

type PortalWarpCanvasProps = {
  active: boolean;
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function easeInCubic(value: number) {
  return value * value * value;
}

export function PortalWarpCanvas({ active }: PortalWarpCanvasProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const activeRef = useRef(active);
  const startedAtRef = useRef(0);

  useEffect(() => {
    activeRef.current = active;
    if (active) startedAtRef.current = performance.now();
  }, [active]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      host.dataset.webgl = "unavailable";
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio, 1), 1.65));
    renderer.domElement.className = "portal-warp-canvas__surface";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 260);
    camera.position.z = 10;

    const tunnel = new THREE.Group();
    scene.add(tunnel);

    const compact = window.matchMedia("(max-width: 720px)").matches;
    const particleCount = compact ? 520 : 900;
    const streakCount = compact ? 130 : 220;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSeeds = new Float32Array(particleCount * 3);

    for (let index = 0; index < particleCount; index += 1) {
      const radius = 1.9 + Math.pow(Math.random(), 0.62) * 12.5;
      const angle = Math.random() * Math.PI * 2;
      const z = 8 - Math.random() * 210;
      particleSeeds[index * 3] = radius;
      particleSeeds[index * 3 + 1] = angle;
      particleSeeds[index * 3 + 2] = z;
      particlePositions[index * 3] = Math.cos(angle) * radius;
      particlePositions[index * 3 + 1] = Math.sin(angle) * radius;
      particlePositions[index * 3 + 2] = z;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xb7e7ff,
      size: compact ? 0.064 : 0.052,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    tunnel.add(particles);

    const streakPositions = new Float32Array(streakCount * 6);
    const streakSeeds = Array.from({ length: streakCount }, () => ({
      radius: 2.2 + Math.pow(Math.random(), 0.64) * 13,
      angle: Math.random() * Math.PI * 2,
      z: 8 - Math.random() * 210,
      length: 0.7 + Math.random() * 2.8,
    }));
    const streakGeometry = new THREE.BufferGeometry();
    streakGeometry.setAttribute("position", new THREE.BufferAttribute(streakPositions, 3));
    const streakMaterial = new THREE.LineBasicMaterial({
      color: 0x9bdcf8,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const streaks = new THREE.LineSegments(streakGeometry, streakMaterial);
    tunnel.add(streaks);

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
      camera.aspect = Math.max(width, 1) / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = new THREE.Timer();
    let animationFrame = 0;

    const render = () => {
      animationFrame = window.requestAnimationFrame(render);
      timer.update();
      const delta = Math.min(timer.getDelta(), 0.034);

      if (!activeRef.current || reducedMotion.matches) {
        renderer.clear();
        return;
      }

      const elapsed = performance.now() - startedAtRef.current;
      const progress = clamp(elapsed / WARP_DURATION_MS);
      const acceleration = easeInCubic(clamp((progress - 0.16) / 0.72));
      const speed = 2.2 + acceleration * 126;
      const swirl = 0.02 + acceleration * 0.16;

      for (let index = 0; index < particleCount; index += 1) {
        const positionIndex = index * 3;
        let z = particleSeeds[positionIndex + 2] + speed * delta;
        if (z > 9) z = -205 - Math.random() * 24;
        particleSeeds[positionIndex + 2] = z;
        const angle = particleSeeds[positionIndex + 1] + elapsed * 0.000035 * swirl;
        const radius = particleSeeds[positionIndex];
        particlePositions[positionIndex] = Math.cos(angle) * radius;
        particlePositions[positionIndex + 1] = Math.sin(angle) * radius;
        particlePositions[positionIndex + 2] = z;
      }
      particleGeometry.attributes.position.needsUpdate = true;

      streakSeeds.forEach((seed, index) => {
        seed.z += speed * delta;
        if (seed.z > 9) seed.z = -205 - Math.random() * 32;
        const positionIndex = index * 6;
        const angle = seed.angle + elapsed * 0.00004 * swirl;
        const x = Math.cos(angle) * seed.radius;
        const y = Math.sin(angle) * seed.radius;
        const tail = seed.length * (0.55 + acceleration * 4.8);
        streakPositions[positionIndex] = x;
        streakPositions[positionIndex + 1] = y;
        streakPositions[positionIndex + 2] = seed.z;
        streakPositions[positionIndex + 3] = x;
        streakPositions[positionIndex + 4] = y;
        streakPositions[positionIndex + 5] = seed.z - tail;
      });
      streakGeometry.attributes.position.needsUpdate = true;

      particleMaterial.opacity = clamp(progress * 3.5) * (0.15 + acceleration * 0.46);
      streakMaterial.opacity = clamp((progress - 0.12) * 4.5) * (0.07 + acceleration * 0.62);

      tunnel.rotation.z += delta * (0.005 + acceleration * 0.05);
      camera.fov = 60 + acceleration * 24;
      camera.position.z = 10 + acceleration * 1.4;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      particleGeometry.dispose();
      particleMaterial.dispose();
      streakGeometry.dispose();
      streakMaterial.dispose();
      timer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <span ref={hostRef} className="portal-warp-canvas" aria-hidden="true" />;
}

export function PortalGravityField() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
    } catch {
      host.dataset.webgl = "unavailable";
      return;
    }

    renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio, 1), 1.35));
    renderer.domElement.className = "portal-gravity-field__surface";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0, 0) },
    };

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms,
      vertexShader: `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uPointer;

        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float stars(vec2 uv, float scale, float threshold) {
          vec2 grid = floor(uv * scale);
          vec2 cell = fract(uv * scale) - 0.5;
          float seed = hash(grid);
          float size = smoothstep(0.085, 0.0, length(cell));
          return size * smoothstep(threshold, 1.0, seed);
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / uResolution.xy;
          vec2 p = uv - vec2(0.68, 0.51);
          p.x *= uResolution.x / uResolution.y;
          p += uPointer * 0.018;

          float radius = max(length(p), 0.025);
          float angle = atan(p.y, p.x);
          float gravity = 0.055 / radius;
          vec2 warped = vec2(cos(angle + gravity), sin(angle + gravity)) * (radius + gravity * 0.16);
          warped += vec2(uTime * 0.007, -uTime * 0.003);

          float dust = stars(warped, 34.0, 0.965);
          dust += stars(warped * 1.27 + 7.3, 61.0, 0.984) * 0.55;

          float orbit = exp(-abs(radius - 0.235) * 34.0) * 0.13;
          orbit *= 0.55 + 0.45 * sin(angle * 3.0 - uTime * 0.22);
          float core = exp(-radius * 7.5) * 0.16;
          float vignette = smoothstep(1.2, 0.18, distance(uv, vec2(0.54)));

          vec3 deep = vec3(0.008, 0.045, 0.082);
          vec3 blue = vec3(0.12, 0.48, 0.72);
          vec3 pale = vec3(0.62, 0.84, 0.94);
          vec3 color = deep;
          color += blue * orbit;
          color += pale * dust * (0.26 + gravity * 0.55);
          color += blue * core;
          color *= 0.72 + vignette * 0.34;

          gl_FragColor = vec4(color, 0.74);
        }
      `,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
      uniforms.uResolution.value.set(Math.max(width, 1), Math.max(height, 1));
    };

    const onPointerMove = (event: PointerEvent) => {
      uniforms.uPointer.value.x = (event.clientX / window.innerWidth - 0.5) * 2;
      uniforms.uPointer.value.y = (event.clientY / window.innerHeight - 0.5) * -2;
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const startedAt = performance.now();
    let animationFrame = 0;

    const render = () => {
      uniforms.uTime.value = reducedMotion.matches ? 0 : (performance.now() - startedAt) / 1000;
      renderer.render(scene, camera);
      if (!reducedMotion.matches) animationFrame = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", onPointerMove);
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="portal-gravity-field" aria-hidden="true" />;
}
